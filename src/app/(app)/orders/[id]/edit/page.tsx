import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Service, Order } from "@/lib/types";
import { EditOrderForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");
  const supabase = createClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", params.id).is("deleted_at", null).maybeSingle();
  if (!order) notFound();
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", params.id);
  const { data: services } = await supabase.from("services").select("*").eq("active", true).order("name");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Sửa đơn {(order as Order).order_no}</h1>
      <p className="text-sm text-amber-700">Sửa đơn sẽ tính lại doanh thu và được ghi vào audit log.</p>
      <EditOrderForm order={order as Order} items={items ?? []} services={(services ?? []) as Service[]} />
    </div>
  );
}
