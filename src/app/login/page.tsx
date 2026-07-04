"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const ACCOUNTS: Record<string, string> = {
  dung: "dung@dnhouse.local",
  ngan: "ngan@dnhouse.local",
  thi: "thi@dnhouse.local",
  chame: "chame@dnhouse.local",
};

function normalizeAccount(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

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
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ensureInternalUsers() {
    const response = await withTimeout(
      fetch("/api/internal-users/ensure", { method: "POST" }),
      "Không thể chuẩn bị tài khoản nội bộ. Vui lòng thử lại.",
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error ?? "Không thể chuẩn bị tài khoản nội bộ.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const email = ACCOUNTS[normalizeAccount(account)];
      if (!email) {
        throw new Error("Tài khoản hoặc mật khẩu không đúng.");
      }

      await ensureInternalUsers();

      const supabase = createClient();
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        "Hệ thống phản hồi chậm. Vui lòng thử lại.",
      );

      if (error) {
        throw new Error("Tài khoản hoặc mật khẩu không đúng.");
      }

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
            Đăng nhập để vào phần mềm quản lý nội bộ
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Tài khoản</Label>
            <Input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              required
            />
          </div>

          <div>
            <Label>Mật khẩu</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
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
      </Card>
    </main>
  );
}
