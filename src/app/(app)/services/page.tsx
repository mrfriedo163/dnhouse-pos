import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";
import { ServicesManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");
  const supabase = createClient();
  const { data } = await supabase.from("services").select("*").order("name");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dịch vụ</h1>
      <ServicesManager initial={(data ?? []) as Service[]} />
    </div>
  );
}
