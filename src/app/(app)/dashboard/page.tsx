import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { Stat, Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/calc";
import { dayRange } from "@/lib/report-service";
import { isReviewDue } from "@/lib/reminder";
import type { FormReviewState } from "@/lib/types";
import { ReminderBanner } from "./reminder-banner";

export const dynamic = "force-dynamic";

function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export default async function Dashboard() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const admin = createAdminClient();
  const { start, end } = dayRange(todayLocal());
  const nowIso = new Date().toISOString();

  const { data: todayOrders } = await supabase
    .from("orders")
    .select("*")
    .gte("received_at", start)
    .lte("received_at", end);
  const orders = todayOrders ?? [];
  const revenue = orders.reduce((sum, order) => sum + Number(order.final_total), 0);
  const discount = orders.reduce((sum, order) => sum + Number(order.discount_total), 0);
  const completed = orders.filter((order) => order.is_completed).length;

  const { count: pendingCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("is_completed", false);
  const { count: overdueCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("is_completed", false)
    .lt("due_at", nowIso);

  const { data: drive } = await admin.from("drive_settings").select("connected, root_folder_url").limit(1).maybeSingle();

  const { data: fr } = await admin.from("app_settings").select("value").eq("key", "form_review").maybeSingle();
  const review = (fr?.value ?? {}) as FormReviewState;
  const showReminder = (profile.role === "admin" || review.staff_can_see) && isReviewDue(review);

  return (
    <div className="space-y-5">
      {showReminder && <ReminderBanner driveFolderUrl={drive?.root_folder_url ?? null} />}

      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-promo">DN House POS</p>
            <h1 className="mt-2 text-2xl font-black text-navy md:text-3xl">Tổng quan hôm nay</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">Ngày {todayLocal()} · Theo dõi đơn nhận, đơn trả và doanh thu tại tiệm.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/orders/new"><Button>+ Tạo đơn</Button></Link>
            <Link href="/orders/out"><Button variant="secondary">Trả đồ</Button></Link>
            <Link href="/orders"><Button variant="secondary">Tìm đơn</Button></Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Đơn nhận hôm nay" value={orders.length} />
        <Stat label="Doanh thu hôm nay" value={formatVnd(revenue)} hint="Tính theo ngày nhận đơn" />
        <Stat label="Giảm giá hôm nay" value={formatVnd(discount)} />
        <Stat label="Đơn đã hoàn thành" value={completed} />
        <Stat label="Đơn đang xử lý" value={pendingCount ?? 0} />
        <Stat label="Đơn quá hạn trả" value={overdueCount ?? 0} />
      </div>

      {profile.role === "admin" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardTitle>Google Drive</CardTitle>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className={drive?.connected ? "font-bold text-emerald-600" : "font-bold text-red-600"}>
                {drive?.connected ? "Đã kết nối" : "Chưa kết nối"}
              </span>
              <Link href="/drive"><Button variant="secondary">Quản lý Drive</Button></Link>
            </div>
          </Card>

          <Card>
            <CardTitle>Quản trị nhanh</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/reports"><Button variant="secondary">Báo cáo</Button></Link>
              <Link href="/services"><Button variant="secondary">Dịch vụ</Button></Link>
              <Link href="/settings"><Button variant="ghost">Cài đặt</Button></Link>
              {drive?.root_folder_url && (
                <a href={drive.root_folder_url} target="_blank" rel="noreferrer">
                  <Button variant="ghost">Mở thư mục Drive</Button>
                </a>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
