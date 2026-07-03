import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForm } from "./form";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");
  const admin = createAdminClient();
  const { data: settings } = await admin.from("app_settings").select("*");
  const { data: staff } = await admin.from("profiles").select("*").order("created_at");
  const map: Record<string, any> = {};
  for (const s of settings ?? []) map[s.key] = s.value;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Cài đặt</h1>
      <SettingsForm settings={map} staff={staff ?? []} />
    </div>
  );
}
