import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDailyData } from "@/lib/report-service";
import { buildDailyReport } from "@/lib/excel/report";
import { getConnectedDrive } from "@/lib/google/store";
import { ensureDatedFolder, uploadFile } from "@/lib/google/drive";
import type { ShopInfo } from "@/lib/types";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { date, upload } = await request.json();
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: shopRow } = await admin.from("app_settings").select("value").eq("key", "shop_info").maybeSingle();
  const shop = (shopRow?.value ?? { shop_name: "DN HOUSE" }) as ShopInfo;

  const data = await buildDailyData(date, shop.shop_name);
  const buf = await buildDailyReport(data);
  const fileName = `DailyReport-${date}.xlsx`;

  if (upload) {
    try {
      const { drive, settings } = await getConnectedDrive();
      const folderId = await ensureDatedFolder(drive, settings.root_folder_id!, "Daily Reports", new Date(`${date}T00:00:00+07:00`));
      const up = await uploadFile(drive, folderId, fileName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf);
      await admin.from("generated_files").insert({
        file_type: "daily_report", file_name: up.name, drive_file_id: up.fileId, drive_web_url: up.webViewLink, generated_by: profile.id,
      });
      return NextResponse.json({ ok: true, name: up.name, url: up.webViewLink });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
    }
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}
