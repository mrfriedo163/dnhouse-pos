import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Return the current user's profile (or null). Use in server components / route handlers. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

export function assertAdmin(profile: Profile | null): asserts profile is Profile {
  if (!profile || profile.role !== "admin" || !profile.active) {
    throw new Error("FORBIDDEN: admin only");
  }
}
