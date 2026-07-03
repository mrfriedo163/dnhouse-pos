import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { ReportsPanel } from "./panel";
export const dynamic = "force-dynamic";
export default async function ReportsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Báo cáo</h1>
      <ReportsPanel />
    </div>
  );
}
