import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";
import { NewOrderForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("services").select("*").eq("active", true).order("name");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Tạo đơn IN</h1>
      <NewOrderForm services={(data ?? []) as Service[]} />
    </div>
  );
}
