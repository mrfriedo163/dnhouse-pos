import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dayRange } from "@/lib/report-service";
import ExcelJS from "exceljs";
import { fillExcelTemplate, type ExcelMapping } from "@/lib/excel/template-fill";
import { getConnectedDrive } from "@/lib/google/store";
import { ensureDatedFolder, uploadFile } from "@/lib/google/drive";
import type { Order } from "@/lib/types";

const DISCLAIMER = "File này chỉ dùng để chuẩn bị số liệu nội bộ. Hãy rà soát lại quy định/mẫu biểu mới nhất trước khi sử dụng chính thức.";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Build the declaration field rows for a date range. */
async function buildRows(startIso: string, endIso: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("orders").select("*").gte("received_at", startIso).lte("received_at", endIso).order("received_at");
  const orders = (data ?? []) as Order[];

  // services_summary per order
  const ids = orders.map((o) => o.id);
  const summaryByOrder = new Map<string, string>();
  if (ids.length) {
    const { data: items } = await admin.from("order_items").select("order_id, service_name_snapshot, quantity").in("order_id", ids);
    for (const it of items ?? []) {
      const prev = summaryByOrder.get(it.order_id) ?? "";
      summaryByOrder.set(it.order_id, `${prev ? prev + "; " : ""}${it.service_name_snapshot} x${it.quantity}`);
    }
  }
  const rows = orders.map((o) => ({
    received_at: o.received_at,
    order_no: o.order_no,
    customer_name: o.customer_name ?? "",
    customer_phone: o.customer_phone ?? "",
    services_summary: summaryByOrder.get(o.id) ?? "",
    subtotal: Number(o.subtotal),
    discount_total: Number(o.discount_total),
    final_total: Number(o.final_total),
    note: o.note ?? "",
    created_by: o.created_by ?? "",
  }));
  return { orders, rows };
}

/** Default generated workbook when no template is chosen. */
async function buildDefaultWorkbook(rows: Awaited<ReturnType<typeof buildRows>>["rows"]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Declaration");
  ws.addRow([DISCLAIMER]);
  ws.addRow([]);
  const head = ws.addRow(["received_at", "order_no", "customer_name", "customer_phone", "services_summary", "subtotal", "discount_total", "final_total", "note", "created_by"]);
  head.font = { bold: true };
  for (const r of rows) {
    ws.addRow([r.received_at, r.order_no, r.customer_name, r.customer_phone, r.services_summary, r.subtotal, r.discount_total, r.final_total, r.note, r.created_by]);
  }
  const total = ws.addRow(["", "", "", "", "TỔNG",
    rows.reduce((s, r) => s + r.subtotal, 0),
    rows.reduce((s, r) => s + r.discount_total, 0),
    rows.reduce((s, r) => s + r.final_total, 0), "", ""]);
  total.font = { bold: true };
  ws.columns.forEach((c) => (c.width = 18));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { from, to, upload, templateId } = await request.json();
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const admin = createAdminClient();
  const startIso = dayRange(from).start;
  const endIso = dayRange(to).end;
  const { rows } = await buildRows(startIso, endIso);

  let buf: Buffer;
  if (templateId) {
    // Fill an admin-uploaded Excel template.
    const { data: tpl } = await admin.from("excel_templates").select("*").eq("id", templateId).maybeSingle();
    if (!tpl || !tpl.drive_file_id) return NextResponse.json({ error: "Template not found or missing Drive file" }, { status: 400 });
    try {
      const { drive } = await getConnectedDrive();
      const res = await drive.files.get({ fileId: tpl.drive_file_id, alt: "media" }, { responseType: "arraybuffer" });
      buf = await fillExcelTemplate(new Uint8Array(res.data as ArrayBuffer), (tpl.mapping_json ?? {}) as ExcelMapping, rows);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Template fill failed" }, { status: 500 });
    }
  } else {
    buf = await buildDefaultWorkbook(rows);
  }

  const fileName = `Declaration-${from}_${to}.xlsx`;
  if (upload) {
    try {
      const { drive, settings } = await getConnectedDrive();
      const folderId = await ensureDatedFolder(drive, settings.root_folder_id!, "Declaration Drafts", new Date(`${to}T00:00:00+07:00`));
      const up = await uploadFile(drive, folderId, fileName, XLSX_MIME, buf);
      await admin.from("generated_files").insert({
        file_type: "declaration_draft", file_name: up.name, drive_file_id: up.fileId, drive_web_url: up.webViewLink, generated_by: profile.id,
      });
      await admin.from("audit_logs").insert({
        actor_id: profile.id, action: "declaration.export", entity_type: "declaration", entity_id: up.fileId,
        after_data: { from, to, templateId: templateId ?? null },
      });
      return NextResponse.json({ ok: true, name: up.name, url: up.webViewLink });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
    }
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: { "content-type": XLSX_MIME, "content-disposition": `attachment; filename="${fileName}"` },
  });
}
