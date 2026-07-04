"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const ACCOUNTS = [
  { id: "dung", name: "Dung", email: "dung@dnhouse.local", role: "admin" },
  { id: "ngan", name: "Ngan", email: "ngan@dnhouse.local", role: "staff" },
  { id: "thi", name: "Thi", email: "thi@dnhouse.local", role: "staff" },
  { id: "chame", name: "chame", email: "chame@dnhouse.local", role: "staff" },
] as const;

function withTimeout<T>(promise: Promise<T>, message: string, ms = 15_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export default function LoginPage() {
  const router = useRouter();
  const [accountId, setAccountId] = useState<(typeof ACCOUNTS)[number]["id"]>("dung");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedAccount = ACCOUNTS.find((account) => account.id === accountId) ?? ACCOUNTS[0];

  async function ensureInternalUsers() {
    const response = await withTimeout(
      fetch("/api/internal-users/ensure", { method: "POST" }),
      "Không tạo được tài khoản nội bộ sau 15 giây. Kiểm tra biến môi trường Supabase trên Vercel.",
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error ?? "Không tạo được tài khoản nội bộ.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await ensureInternalUsers();

      const supabase = createClient();
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: selectedAccount.email,
          password,
        }),
        "Supabase không phản hồi sau 15 giây. Kiểm tra lại cấu hình Supabase/Vercel.",
      );

      if (error) throw error;

      router.replace("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,42,67,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,42,67,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-sky-100 to-transparent" />

      <Card className="relative w-full max-w-md border-sky-100 p-6 shadow-lift">
        <div className="mb-6 text-center">
          <Image
            src="/dn-house-logo.jpg"
            alt="DN House"
            width={76}
            height={76}
            className="mx-auto rounded-xl border border-sky-100 bg-white object-cover shadow-soft"
            priority
          />
          <h1 className="mt-4 text-2xl font-black text-navy">DN House POS</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Đăng nhập tài khoản nội bộ để quản lý đơn
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Tài khoản</Label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value as typeof accountId)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-navy outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            >
              {ACCOUNTS.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} {account.role === "admin" ? "- Admin" : "- Nhân viên"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Mật khẩu</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="123456789"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-4 rounded-xl bg-sky-50 px-3 py-3 text-sm font-semibold text-slate-600">
          Mật khẩu chung: <span className="font-black text-navy">123456789</span>
        </div>
      </Card>
    </main>
  );
}
