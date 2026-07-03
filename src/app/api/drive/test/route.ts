import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getConnectedDrive } from "@/lib/google/store";
import { ensureFolder, uploadFile } from "@/lib/google/drive";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const { drive, settings } = await getConnectedDrive();
    const folderId = await ensureFolder(drive, "Backups", settings.root_folder_id!);
    const name = `test-${Date.now()}.txt`;
    const up = await uploadFile(drive, folderId, name, "text/plain", Buffer.from("DN House Drive connection OK\n"));
    const admin = createAdminClient();
    await admin.from("drive_settings").update({ last_test_at: new Date().toISOString() }).eq("id", settings.id);
    return NextResponse.json({ ok: true, name: up.name, url: up.webViewLink });
  } catch (e: any) {
    const code = e?.code === "NOT_CONNECTED" ? 409 : 500;
    return NextResponse.json({ error: e?.message ?? "Test failed" }, { status: code });
  }
}
