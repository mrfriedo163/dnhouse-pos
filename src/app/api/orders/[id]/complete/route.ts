import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  // Completion does NOT touch revenue fields.
  const { data, error } = await admin.from("orders").update({
    is_completed: true,
    completed_at: new Date().toISOString(),
    completed_by: profile.id,
    completed_note: body.completed_note ?? null,
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
  }).eq("id", params.id).is("deleted_at", null).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("audit_logs").insert({
    actor_id: profile.id, action: "order.complete", entity_type: "order", entity_id: params.id,
  });
  return NextResponse.json({ order: data });
}

// Admin-only: undo completion (kept for orders list / detail admin actions).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const admin = createAdminClient();
  const { data: before } = await admin.from("orders").select("*").eq("id", params.id).is("deleted_at", null).single();
  const { error } = await admin.from("orders").update({
    is_completed: false, completed_at: null, completed_by: null, completed_note: null,
    updated_at: new Date().toISOString(), updated_by: profile.id,
  }).eq("id", params.id).is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("audit_logs").insert({
    actor_id: profile.id, action: "order.uncomplete", entity_type: "order", entity_id: params.id, before_data: before,
  });
  return NextResponse.json({ ok: true });
}
