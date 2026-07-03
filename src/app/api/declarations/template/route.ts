import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectSheets } from "@/lib/excel/template-fill";
import { getConnectedDrive } from "@/lib/google/store";
import { ensureFolder, uploadFile } from "@/lib/google/drive";

// POST: inspect sheets of an uploaded .xlsx template (no persistence).
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { xlsxBase64 } = await request.json();
  if (!xlsxBase64) return NextResponse.json({ error: "xlsxBase64 required" }, { status: 400 });
  try {
    const sheets = await inspectSheets(new Uint8Array(Buffer.from(xlsxBase64, "base64")));
    return NextResponse.json({ sheets });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Cannot read Excel file" }, { status: 400 });
  }
}

// PUT: save an Excel declaration template + mapping. Uploads original to Drive Templates/.
export async function PUT(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { name, xlsxBase64, original_file_name, mapping_json } = await request.json();
  if (!name || !xlsxBase64) return NextResponse.json({ error: "name and xlsxBase64 required" }, { status: 400 });
  const admin = createAdminClient();

  let drive_file_id: string | null = null;
  let drive_web_url: string | null = null;
  try {
    const { drive, settings } = await getConnectedDrive();
    const tplFolder = await ensureFolder(drive, "Templates", settings.root_folder_id!);
    const up = await uploadFile(drive, tplFolder, original_file_name ?? `${name}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Buffer.from(xlsxBase64, "base64"));
    drive_file_id = up.fileId; drive_web_url = up.webViewLink;
  } catch { /* Drive not connected — still save the row + mapping. */ }

  const { data, error } = await admin.from("excel_templates").insert({
    name, template_type: "declaration", drive_file_id, drive_web_url,
    original_file_name: original_file_name ?? null, mapping_json: mapping_json ?? {},
    active: false, created_by: profile.id,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: profile.id, action: "excel_template.create", entity_type: "excel_template", entity_id: data.id,
    after_data: { name },
  });
  return NextResponse.json({ template: data, driveSaved: !!drive_file_id });
}
