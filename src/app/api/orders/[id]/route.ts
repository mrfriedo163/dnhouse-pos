import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { updateOrder } from "@/lib/order-service";
import type { OrderInput } from "@/lib/types";

// PATCH: admin-only order edit (recomputes revenue + audit log).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  let body: OrderInput & { received_at?: string | null };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  try {
    const { order } = await updateOrder(params.id, body, profile.id);
    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}

// DELETE: admin-only hard delete with audit log.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: before } = await admin.from("orders").select("*").eq("id", params.id).single();
  const { error } = await admin.from("orders").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("audit_logs").insert({
    actor_id: profile.id, action: "order.delete", entity_type: "order", entity_id: params.id, before_data: before,
  });
  return NextResponse.json({ ok: true });
}
