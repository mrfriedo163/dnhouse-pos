import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { buildAuthUrl } from "@/lib/google/oauth";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  // state carries the admin profile id (verified again on callback).
  const url = buildAuthUrl(profile.id);
  return NextResponse.redirect(url, 302);
}
