import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER ONLY. Bypasses RLS.
 * Use for trusted server-side writes (order creation, revenue math, drive tokens).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role env vars missing");
  return createSbClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
