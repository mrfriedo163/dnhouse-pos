"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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
          <p className="mt-1 text-sm font-semibold text-slate-500">Quản lý đơn giặt sấy, trả đồ và báo cáo nội bộ</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label>Họ tên</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Mật khẩu</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
          </Button>
        </form>

        <button
          className="mt-4 w-full text-center text-sm font-bold text-slate-500 transition hover:text-navy"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </Card>
    </main>
  );
}
