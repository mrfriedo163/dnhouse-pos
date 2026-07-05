import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { updateOrder } from "@/lib/order-service";
import type { OrderInput } from "@/lib/types";

// PATCH: admin-only bill edit (recomputes revenue + audit log).
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

// DELETE: admin-only soft delete. The row stays in Supabase for audit/tax review.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const body = await request.json().catch(() => ({}));
  const { data: before } = await admin.from("orders").select("*").eq("id", params.id).single();
  const deletedAt = new Date().toISOString();
  const { data: order, error } = await admin.from("orders").update({
    deleted_at: deletedAt,
    deleted_by: profile.id,
    delete_reason: body.delete_reason ?? null,
    updated_at: deletedAt,
    updated_by: profile.id,
  }).eq("id", params.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    action: "order.delete",
    entity_type: "order",
    entity_id: params.id,
    before_data: before,
    after_data: { deleted_at: deletedAt, delete_reason: body.delete_reason ?? null },
  });
  return NextResponse.json({ ok: true, order });
}
