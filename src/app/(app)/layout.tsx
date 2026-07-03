import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.active) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-soft">
          <h1 className="text-lg font-extrabold text-navy">Tài khoản đã bị khóa</h1>
          <p className="mt-2 text-sm text-slate-500">Liên hệ quản trị viên để mở lại.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-sky-100 bg-white/90 backdrop-blur-xl">
        <div className="app-shell flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/dn-house-logo.jpg"
                alt="DN House"
                width={44}
                height={44}
                className="rounded-lg border border-sky-100 bg-white object-cover shadow-soft"
                priority
              />
              <div>
                <div className="text-base font-black leading-tight text-navy">DN House POS</div>
                <div className="text-xs font-semibold text-slate-500">Quản lý giặt sấy nội bộ</div>
              </div>
            </div>
            <form action="/auth/signout" method="post" className="lg:hidden">
              <button className="rounded-lg border border-sky-100 px-3 py-2 text-xs font-bold text-slate-600">
                Đăng xuất
              </button>
            </form>
          </div>

          <Nav role={profile.role} />

          <form action="/auth/signout" method="post" className="hidden lg:block">
            <button className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-soft transition hover:border-navy hover:text-navy">
              {profile.full_name ?? "Nhân viên"} · Đăng xuất
            </button>
          </form>
        </div>
      </header>
      <main className="app-shell py-5">{children}</main>
    </div>
  );
}
