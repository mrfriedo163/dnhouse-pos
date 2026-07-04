"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("YOUR-PROJECT") || anonKey.includes("your-anon-key")) {
    throw new Error("Chưa cấu hình Supabase trên Vercel. Cần thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createBrowserClient(url, anonKey);
}
