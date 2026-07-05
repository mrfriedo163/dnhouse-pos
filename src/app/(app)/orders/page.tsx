import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/calc";
import { getCurrentProfile } from "@/lib/auth";
import type { Order } from "@/lib/types";
import { DeleteOrderButton } from "./delete-order-button";

export const dynamic = "force-dynamic";

export default async function OrdersList({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; q?: string; deleted?: string };
}) {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const showingDeleted = searchParams.deleted === "1";

  let query = supabase.from("orders").select("*").order("received_at", { ascending: false }).limit(100);

  if (showingDeleted) {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (searchParams.from) query = query.gte("received_at", new Date(`${searchParams.from}T00:00:00+07:00`).toISOString());
  if (searchParams.to) query = query.lte("received_at", new Date(`${searchParams.to}T23:59:59+07:00`).toISOString());
  if (searchParams.q) query = query.or(`order_no.ilike.%${searchParams.q}%,customer_phone.ilike.%${searchParams.q}%,customer_name.ilike.%${searchParams.q}%`);

  const { data } = await query;
  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">{showingDeleted ? "Bill đã xóa" : "Lịch sử bill"}</h1>
          <p className="text-sm text-slate-500">
            {showingDeleted
              ? "Các bill đã đánh dấu xóa chỉ dùng để đối soát, không vào báo cáo/kê khai."
              : "Tạo bill xong là ghi doanh thu ngay."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              href={showingDeleted ? "/orders" : "/orders?deleted=1"}
              className="rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-navy shadow-soft"
            >
              {showingDeleted ? "Bill đang dùng" : "Bill đã xóa"}
            </Link>
          )}
          {!showingDeleted && (
            <Link href="/orders/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
              Tạo bill mới
            </Link>
          )}
        </div>
      </div>

      <form className="grid gap-2 sm:grid-cols-5" method="get">
        {showingDeleted && <input type="hidden" name="deleted" value="1" />}
        <input name="from" type="date" defaultValue={searchParams.from} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="to" type="date" defaultValue={searchParams.to} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="q" placeholder="Mã / SĐT / tên" defaultValue={searchParams.q} className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Tìm bill</button>
      </form>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-2">Mã bill</th>
              <th>Ngày</th>
              <th>Khách</th>
              <th>SDT</th>
              <th className="text-right">Tổng tiền</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-2 font-medium">{order.order_no}</td>
                <td>{new Date(order.received_at).toLocaleDateString("vi-VN")}</td>
                <td>{order.customer_name ?? "-"}</td>
                <td>{order.customer_phone ?? "-"}</td>
                <td className="text-right">{formatVnd(order.final_total)}</td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/orders/${order.id}`} className="text-brand underline">
                      Xem / in
                    </Link>
                    {isAdmin && !showingDeleted && <DeleteOrderButton orderId={order.id} orderNo={order.order_no} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {orders.map((order) => (
          <Card key={order.id}>
            <div className="space-y-3">
              <Link href={`/orders/${order.id}`} className="block">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{order.order_no}</span>
                  <span>{formatVnd(order.final_total)}</span>
                </div>
                <div className="text-sm text-slate-500">
                  {order.customer_name ?? "khách lẻ"} · {new Date(order.received_at).toLocaleDateString("vi-VN")}
                </div>
              </Link>
              {isAdmin && !showingDeleted && <DeleteOrderButton orderId={order.id} orderNo={order.order_no} />}
            </div>
          </Card>
        ))}
      </div>

      {orders.length === 0 && <p className="text-sm text-slate-400">Chưa có bill phù hợp.</p>}
    </div>
  );
}
