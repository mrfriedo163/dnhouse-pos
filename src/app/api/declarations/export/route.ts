import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dayRange } from "@/lib/report-service";
import { fillExcelTemplate, type ExcelMapping } from "@/lib/excel/template-fill";
import { getConnectedDrive } from "@/lib/google/store";
import { ensureDatedFolder, uploadFile } from "@/lib/google/drive";
import type { Order, ShopInfo } from "@/lib/types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SA01_TEMPLATE_PATH = path.join(process.cwd(), "templates", "tax", "Sa01-HKD.xlsx");

interface DeclarationRow {
  received_at: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  services_summary: string;
  subtotal: number;
  discount_total: number;
  final_total: number;
  note: string;
  created_by: string;
}

function formatDateVi(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

async function loadShopInfo(admin: ReturnType<typeof createAdminClient>): Promise<ShopInfo> {
  const { data } = await admin.from("app_settings").select("value").eq("key", "shop_info").maybeSingle();
  return (data?.value ?? {
    shop_name: "Hộ Kinh Doanh Giặt Sấy DN House",
    business_type: "Hộ kinh doanh",
    address: "648/24 Khu vực Bình Trung, Phường Long Tuyền, Quận Bình Thủy, TP. Cần Thơ",
    phone: "0945 632 853",
  }) as ShopInfo;
}

/** Build declaration rows for a date range. Deleted orders are excluded. */
async function buildRows(startIso: string, endIso: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("*")
    .is("deleted_at", null)
    .gte("received_at", startIso)
    .lte("received_at", endIso)
    .order("received_at");
  const orders = (data ?? []) as Order[];

  const ids = orders.map((o) => o.id);
  const summaryByOrder = new Map<string, string>();
  if (ids.length) {
    const { data: items } = await admin
      .from("order_items")
      .select("order_id, service_name_snapshot, quantity")
      .in("order_id", ids);
    for (const it of items ?? []) {
      const prev = summaryByOrder.get(it.order_id) ?? "";
      summaryByOrder.set(it.order_id, `${prev ? `${prev}; ` : ""}${it.service_name_snapshot} x${it.quantity}`);
    }
  }

  const rows: DeclarationRow[] = orders.map((o) => ({
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
  return { admin, rows };
}

async function buildSa01HkdWorkbook(
  rows: DeclarationRow[],
  from: string,
  to: string,
  shop: ShopInfo,
): Promise<Buffer> {
  const template = await readFile(SA01_TEMPLATE_PATH);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet("Mẫu số S1a-HKD") ?? wb.worksheets[0];
  if (!ws) throw new Error("Sa01-HKD template sheet not found.");

  ws.getCell("A1").value = `HỘ, CÁ NHÂN KINH DOANH: ${shop.shop_name || "Hộ Kinh Doanh Giặt Sấy DN House"}`;
  ws.getCell("A2").value = `Địa chỉ: ${shop.address || ""}`;
  ws.getCell("A6").value = `Địa điểm kinh doanh: ${shop.address || ""}`;
  ws.getCell("A7").value = `Kỳ kê khai: ${from} đến ${to}`;
  ws.getCell("D8").value = "VND";

  const startRow = 11;
  rows.forEach((row, index) => {
    const excelRow = ws.getRow(startRow + index);
    excelRow.getCell(1).value = formatDateVi(row.received_at);
    excelRow.getCell(2).value = `${row.order_no} - ${row.services_summary || "Dịch vụ giặt sấy"}${row.customer_name ? ` - ${row.customer_name}` : ""}`;
    excelRow.getCell(3).value = row.final_total;
    excelRow.commit();
  });

  const totalRowIndex = startRow + rows.length + 1;
  const totalRow = ws.getRow(totalRowIndex);
  totalRow.getCell(2).value = "TỔNG DOANH THU";
  totalRow.getCell(3).value = rows.reduce((sum, row) => sum + row.final_total, 0);
  totalRow.font = { bold: true };
  totalRow.commit();
  ws.getColumn(3).numFmt = '#,##0';

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Generic workbook fallback if the Sa01-HKD template is ever missing. */
async function buildGenericWorkbook(rows: DeclarationRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Declaration");
  const head = ws.addRow(["received_at", "order_no", "customer_name", "customer_phone", "services_summary", "subtotal", "discount_total", "final_total", "note"]);
  head.font = { bold: true };
  for (const r of rows) {
    ws.addRow([r.received_at, r.order_no, r.customer_name, r.customer_phone, r.services_summary, r.subtotal, r.discount_total, r.final_total, r.note]);
  }
  const total = ws.addRow(["", "", "", "", "TOTAL", "", "", rows.reduce((sum, row) => sum + row.final_total, 0), ""]);
  total.font = { bold: true };
  ws.columns.forEach((c) => (c.width = 18));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { from, to, upload, templateId } = await request.json();
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const startIso = dayRange(from).start;
  const endIso = dayRange(to).end;
  const { admin, rows } = await buildRows(startIso, endIso);

  let buf: Buffer;
  let fileName = `Sa01-HKD-${from}_${to}.xlsx`;
  if (templateId) {
    const { data: tpl } = await admin.from("excel_templates").select("*").eq("id", templateId).maybeSingle();
    if (!tpl || !tpl.drive_file_id) return NextResponse.json({ error: "Template not found or missing Drive file" }, { status: 400 });
    try {
      const { drive } = await getConnectedDrive();
      const res = await drive.files.get({ fileId: tpl.drive_file_id, alt: "media" }, { responseType: "arraybuffer" });
      buf = await fillExcelTemplate(
        new Uint8Array(res.data as ArrayBuffer),
        (tpl.mapping_json ?? {}) as ExcelMapping,
        rows as unknown as Record<string, unknown>[],
      );
      fileName = `Declaration-${from}_${to}.xlsx`;
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Template fill failed" }, { status: 500 });
    }
  } else {
    try {
      const shop = await loadShopInfo(admin);
      buf = await buildSa01HkdWorkbook(rows, from, to, shop);
    } catch {
      buf = await buildGenericWorkbook(rows);
      fileName = `Declaration-${from}_${to}.xlsx`;
    }
  }

  if (upload) {
    try {
      const { drive, settings } = await getConnectedDrive();
      const folderId = await ensureDatedFolder(drive, settings.root_folder_id!, "Declaration Drafts", new Date(`${to}T00:00:00+07:00`));
      const up = await uploadFile(drive, folderId, fileName, XLSX_MIME, buf);
      await admin.from("generated_files").insert({
        file_type: "declaration_draft",
        file_name: up.name,
        drive_file_id: up.fileId,
        drive_web_url: up.webViewLink,
        generated_by: profile.id,
      });
      await admin.from("audit_logs").insert({
        actor_id: profile.id,
        action: "declaration.export",
        entity_type: "declaration",
        entity_id: up.fileId,
        after_data: { from, to, templateId: templateId ?? null, rowCount: rows.length },
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
