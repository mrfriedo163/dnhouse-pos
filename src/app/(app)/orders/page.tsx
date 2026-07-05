import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/calc";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrdersList({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; status?: string; q?: string };
}) {
  const supabase = createClient();
  const hasManualFilter = Boolean(searchParams.from || searchParams.to || searchParams.q || searchParams.status);
  const status = searchParams.status ?? (hasManualFilter ? "all" : "pending");
  let query = supabase.from("orders").select("*").order("received_at", { ascending: false }).limit(100);

  if (status === "deleted") {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (searchParams.from) query = query.gte("received_at", new Date(`${searchParams.from}T00:00:00+07:00`).toISOString());
  if (searchParams.to) query = query.lte("received_at", new Date(`${searchParams.to}T23:59:59+07:00`).toISOString());
  if (status === "completed") query = query.eq("is_completed", true);
  if (status === "pending") query = query.eq("is_completed", false);
  if (status === "overdue") query = query.eq("is_completed", false).lt("due_at", new Date().toISOString());
  if (searchParams.q) query = query.or(`order_no.ilike.%${searchParams.q}%,customer_phone.ilike.%${searchParams.q}%,customer_name.ilike.%${searchParams.q}%`);

  const { data } = await query;
  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Đơn hàng</h1>
        <p className="text-sm text-slate-500">
          Mặc định hiển thị đơn chưa trả để nhân viên xử lý nhanh. Cần tìm đơn cũ thì nhập mã, SĐT hoặc tên khách.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/orders?status=pending" className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-navy">
          Chưa trả
        </Link>
        <Link href="/orders?status=completed" className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-navy">
          Đã trả
        </Link>
        <Link href="/orders?status=all" className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-bold text-navy">
          Tất cả
        </Link>
      </div>

      <form className="grid gap-2 sm:grid-cols-5" method="get">
        <input name="from" type="date" defaultValue={searchParams.from} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="to" type="date" defaultValue={searchParams.to} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="pending">Chưa trả</option>
          <option value="completed">Đã trả</option>
          <option value="all">Tất cả</option>
          <option value="overdue">Quá hạn</option>
          <option value="deleted">Đã xóa</option>
        </select>
        <input name="q" placeholder="Mã / SĐT / tên" defaultValue={searchParams.q} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Lọc / tìm đơn</button>
      </form>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-2">Mã đơn</th>
              <th>Nhận</th>
              <th>Khách</th>
              <th>SĐT</th>
              <th>Tổng</th>
              <th>Trạng thái</th>
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
                <td>{formatVnd(order.final_total)}</td>
                <td>{order.deleted_at ? "Đã xóa" : order.is_completed ? "Đã trả" : "Chưa trả"}</td>
                <td><Link href={`/orders/${order.id}`} className="text-brand underline">Xem</Link></td>
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
                <span>{order.deleted_at ? "Đã xóa" : order.is_completed ? "Đã trả" : "Chưa trả"}</span>
              </div>
              <div className="text-sm text-slate-500">{order.customer_name ?? "khách lẻ"} · {formatVnd(order.final_total)}</div>
            </Card>
          </Link>
        ))}
      </div>
      {orders.length === 0 && <p className="text-sm text-slate-400">Không có đơn phù hợp.</p>}
    </div>
  );
}
