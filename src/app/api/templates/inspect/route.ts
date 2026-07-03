import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectFields } from "@/lib/pdf/fill";
import { getConnectedDrive } from "@/lib/google/store";
import { ensureFolder, uploadFile } from "@/lib/google/drive";

// POST: inspect a PDF's fillable fields (no persistence).
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { pdfBase64 } = await request.json();
  if (!pdfBase64) return NextResponse.json({ error: "pdfBase64 required" }, { status: 400 });
  try {
    const bytes = Buffer.from(pdfBase64, "base64");
    const fields = await inspectFields(new Uint8Array(bytes));
    return NextResponse.json({ fields });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Cannot read PDF" }, { status: 400 });
  }
}

// PUT: save a template. Uploads original to Drive Templates/ and stores the mapping.
export async function PUT(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { name, pdfBase64, original_file_name, field_mapping } = await request.json();
  if (!name || !pdfBase64) return NextResponse.json({ error: "name and pdfBase64 required" }, { status: 400 });

  const admin = createAdminClient();
  let drive_file_id: string | null = null;
  let drive_web_url: string | null = null;
  try {
    const { drive, settings } = await getConnectedDrive();
    const tplFolder = await ensureFolder(drive, "Templates", settings.root_folder_id!);
    const up = await uploadFile(drive, tplFolder, original_file_name ?? `${name}.pdf`,
      "application/pdf", Buffer.from(pdfBase64, "base64"));
    drive_file_id = up.fileId; drive_web_url = up.webViewLink;
  } catch {
    // Drive not connected — still save the template row so mapping isn't lost.
  }

  const { data, error } = await admin.from("pdf_templates").insert({
    name, template_type: "bill", drive_file_id, drive_web_url,
    original_file_name: original_file_name ?? null, field_mapping: field_mapping ?? {},
    active: false, created_by: profile.id,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data, driveSaved: !!drive_file_id });
}
