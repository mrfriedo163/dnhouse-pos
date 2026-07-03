import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TemplatesManager } from "./manager";
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");
  const supabase = createClient();
  const { data } = await supabase.from("pdf_templates").select("*").order("created_at", { ascending: false });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mẫu PDF (bill)</h1>
      <p className="text-sm text-slate-500">Tải lên mẫu PDF có form field. App sẽ đọc field và cho phép map sang biến của đơn hàng.</p>
      <TemplatesManager initial={data ?? []} />
    </div>
  );
}
