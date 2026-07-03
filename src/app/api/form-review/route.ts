import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { markReviewed, snooze7Days } from "@/lib/reminder";
import type { FormReviewState } from "@/lib/types";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { action } = await request.json();
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("value").eq("key", "form_review").maybeSingle();
  const current = (data?.value ?? {}) as FormReviewState;
  const patch = action === "reviewed" ? markReviewed() : action === "snooze" ? snooze7Days() : {};
  const next = { ...current, ...patch };
  await admin.from("app_settings").upsert({ key: "form_review", value: next, updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true, form_review: next });
}
