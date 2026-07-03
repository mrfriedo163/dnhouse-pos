import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import ExcelJS from "exceljs";
import { getConnectedDrive } from "@/lib/google/store";
import { ensureFolder, uploadFile } from "@/lib/google/drive";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const TABLES = ["profiles", "services", "orders", "order_items", "generated_files", "daily_closings", "audit_logs"] as const;

/** Export key tables to a multi-sheet workbook. Sensitive token tables are excluded. */
async function buildBackup(admin: ReturnType<typeof createAdminClient>) {
  const wb = new ExcelJS.Workbook();
  const jsonDump: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const { data } = await admin.from(table).select("*").limit(1000);
    const rows = data ?? [];
    jsonDump[table] = rows;
    const ws = wb.addWorksheet(table.slice(0, 31));
    if (rows.length) {
      const cols = Object.keys(rows[0]);
      const head = ws.addRow(cols);
      head.font = { bold: true };
      for (const r of rows) ws.addRow(cols.map((c) => {
        const v = (r as any)[c];
        return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
      }));
      ws.columns.forEach((c) => (c.width = 20));
    } else {
      ws.addRow(["(no rows)"]);
    }
  }
  const xlsx = Buffer.from(await wb.xlsx.writeBuffer());
  const json = Buffer.from(JSON.stringify(jsonDump, null, 2), "utf8");
  return { xlsx, json };
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { upload } = await request.json().catch(() => ({ upload: true }));
  const admin = createAdminClient();
  const { xlsx, json } = await buildBackup(admin);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  if (!upload) {
    return new NextResponse(new Uint8Array(xlsx), {
      headers: { "content-type": XLSX_MIME, "content-disposition": `attachment; filename="backup-${stamp}.xlsx"` },
    });
  }
  try {
    const { drive, settings } = await getConnectedDrive();
    const folderId = await ensureFolder(drive, "Backups", settings.root_folder_id!);
    const upX = await uploadFile(drive, folderId, `backup-${stamp}.xlsx`, XLSX_MIME, xlsx);
    const upJ = await uploadFile(drive, folderId, `backup-${stamp}.json`, "application/json", json);
    await admin.from("generated_files").insert([
      { file_type: "backup", file_name: upX.name, drive_file_id: upX.fileId, drive_web_url: upX.webViewLink, generated_by: profile.id },
      { file_type: "backup", file_name: upJ.name, drive_file_id: upJ.fileId, drive_web_url: upJ.webViewLink, generated_by: profile.id },
    ]);
    await admin.from("audit_logs").insert({ actor_id: profile.id, action: "backup.create", entity_type: "backup", entity_id: stamp });
    return NextResponse.json({ ok: true, xlsx: upX.webViewLink, json: upJ.webViewLink });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Backup upload failed" }, { status: 500 });
  }
}
