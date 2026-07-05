import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/calc";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrdersList({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; q?: string; deleted?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("orders").select("*").order("received_at", { ascending: false }).limit(100);

  if (searchParams.deleted === "1") {
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
          <h1 className="text-xl font-bold">Lịch sử bill</h1>
          <p className="text-sm text-slate-500">Tạo bill xong là ghi doanh thu ngay.</p>
        </div>
        <Link href="/orders/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">
          Tạo bill mới
        </Link>
      </div>

      <form className="grid gap-2 sm:grid-cols-5" method="get">
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
              <th>SĐT</th>
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
                <td><Link href={`/orders/${order.id}`} className="text-brand underline">Xem / in</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <Card>
              <div className="flex justify-between">
                <span className="font-semibold">{order.order_no}</span>
                <span>{formatVnd(order.final_total)}</span>
              </div>
              <div className="text-sm text-slate-500">{order.customer_name ?? "khách lẻ"} · {new Date(order.received_at).toLocaleDateString("vi-VN")}</div>
            </Card>
          </Link>
        ))}
      </div>
      {orders.length === 0 && <p className="text-sm text-slate-400">Chưa có bill phù hợp.</p>}
    </div>
  );
}
