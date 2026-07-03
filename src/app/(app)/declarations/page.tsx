import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeclarationsPanel } from "./panel";
export const dynamic = "force-dynamic";

const DISCLAIMER = "File này chỉ dùng để chuẩn bị số liệu nội bộ. Hãy rà soát lại quy định/mẫu biểu mới nhất trước khi sử dụng chính thức.";

export default async function DeclarationsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");
  const supabase = createClient();
  const { data: templates } = await supabase.from("excel_templates").select("*").order("created_at", { ascending: false });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Kê khai / Kế toán (bản nháp)</h1>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{DISCLAIMER}</div>
      <p className="text-sm text-slate-500">App KHÔNG nộp hồ sơ thuế chính thức. Chỉ chuẩn bị số liệu nháp từ dữ liệu đơn hàng (theo ngày nhận IN).</p>
      <DeclarationsPanel templates={templates ?? []} />
    </div>
  );
}
