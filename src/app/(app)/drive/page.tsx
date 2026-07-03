import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle } from "@/components/ui/card";
import { DriveActions } from "./actions";

export const dynamic = "force-dynamic";

export default async function DrivePage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");
  const admin = createAdminClient();
  const { data } = await admin.from("drive_settings").select("*").limit(1).maybeSingle();

  const status = data?.connected ? "connected" : "not_connected";
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Google Drive</h1>
      <Card>
        <CardTitle>Trạng thái kết nối</CardTitle>
        <p className={`mt-1 font-medium ${status === "connected" ? "text-emerald-600" : "text-red-600"}`}>
          {status === "connected" ? "Đã kết nối" : "Chưa kết nối"}
        </p>
        {data?.last_test_at && <p className="text-xs text-slate-400">Test gần nhất: {new Date(data.last_test_at).toLocaleString("vi-VN")}</p>}
      </Card>
      <DriveActions connected={status === "connected"} rootUrl={data?.root_folder_url ?? null} />
      <p className="text-xs text-slate-400">
        Chỉ Admin cần kết nối Drive. Nhân viên không cần quyền Drive. Token được mã hoá (AES-256-GCM) trước khi lưu.
      </p>
    </div>
  );
}
