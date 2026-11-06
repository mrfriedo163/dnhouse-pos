import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_PASSWORD = "123456789";

const INTERNAL_USERS = [
  { email: "dung@dnhouse.local", fullName: "Dung", role: "admin" },
  { email: "ngan@dnhouse.local", fullName: "Ngan", role: "staff" },
  { email: "thi@dnhouse.local", fullName: "Thi", role: "staff" },
  { email: "chame@dnhouse.local", fullName: "chame", role: "staff" },
] as const;

function missingSupabaseEnv() {
  return [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ].filter(([, value]) => !value).map(([key]) => key);
}

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user.id;
    if (data.users.length < 100) return null;
    page += 1;
  }

  return null;
}

export async function POST() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || !profile.active || profile.role !== "admin") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN: admin only" }, { status: 403 });
    }

    const missing = missingSupabaseEnv();

    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Vercel đang thiếu biến môi trường: ${missing.join(", ")}. Thêm đủ biến trong Vercel rồi redeploy để app tự tạo 4 tài khoản.`,
        },
        { status: 500 },
      );
    }

    const admin = createAdminClient();
    const ensured = [];

    for (const account of INTERNAL_USERS) {
      let userId = await findUserIdByEmail(admin, account.email);
      const isNewUser = !userId;

      if (!userId) {
        const { data, error } = await admin.auth.admin.createUser({
          email: account.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: account.fullName },
        });

        if (error) throw error;
        userId = data.user?.id ?? null;
      }

      if (!userId) {
        throw new Error(`Không tạo được tài khoản ${account.email}`);
      }

      // Preserve roles and account locks that the manager has already configured.
      const { error: profileError } = await admin.from("profiles").upsert(
        {
          id: userId,
          full_name: account.fullName,
          role: account.role,
          active: true,
        },
        { onConflict: "id", ignoreDuplicates: !isNewUser },
      );

      if (profileError) throw profileError;

      ensured.push({ email: account.email, role: account.role });
    }

    return NextResponse.json({ ok: true, users: ensured });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Không tạo được tài khoản nội bộ." },
      { status: 500 },
    );
  }
}
