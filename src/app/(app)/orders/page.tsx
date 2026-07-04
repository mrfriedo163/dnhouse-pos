import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/calc";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrdersList({ searchParams }: {
  searchParams: { from?: string; to?: string; status?: string; q?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("orders").select("*").order("received_at", { ascending: false }).limit(100);

  if (searchParams.status === "deleted") {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (searchParams.from) query = query.gte("received_at", new Date(`${searchParams.from}T00:00:00+07:00`).toISOString());
  if (searchParams.to) query = query.lte("received_at", new Date(`${searchParams.to}T23:59:59+07:00`).toISOString());
  if (searchParams.status === "completed") query = query.eq("is_completed", true);
  if (searchParams.status === "pending") query = query.eq("is_completed", false);
  if (searchParams.status === "overdue") query = query.eq("is_completed", false).lt("due_at", new Date().toISOString());
  if (searchParams.q) query = query.or(`order_no.ilike.%${searchParams.q}%,customer_phone.ilike.%${searchParams.q}%,customer_name.ilike.%${searchParams.q}%`);

  const { data } = await query;
  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Danh sách đơn</h1>
      <form className="grid gap-2 sm:grid-cols-5" method="get">
        <input name="from" type="date" defaultValue={searchParams.from} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="to" type="date" defaultValue={searchParams.to} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Tất cả</option>
          <option value="completed">Đã trả</option>
          <option value="pending">Chưa trả</option>
          <option value="overdue">Quá hạn</option>
          <option value="deleted">Đã xóa</option>
        </select>
        <input name="q" placeholder="Mã / SĐT / tên" defaultValue={searchParams.q} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Lọc theo ngày nhận</button>
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
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-2 font-medium">{o.order_no}</td>
                <td>{new Date(o.received_at).toLocaleDateString("vi-VN")}</td>
                <td>{o.customer_name ?? "-"}</td>
                <td>{o.customer_phone ?? "-"}</td>
                <td>{formatVnd(o.final_total)}</td>
                <td>{o.deleted_at ? "Đã xóa" : o.is_completed ? "Đã trả" : "Đang xử lý"}</td>
                <td><Link href={`/orders/${o.id}`} className="text-brand underline">Xem</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {orders.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`}>
            <Card>
              <div className="flex justify-between">
                <span className="font-semibold">{o.order_no}</span>
                <span>{o.deleted_at ? "Đã xóa" : o.is_completed ? "Đã trả" : "Đang xử lý"}</span>
              </div>
              <div className="text-sm text-slate-500">{o.customer_name ?? "khách lẻ"} · {formatVnd(o.final_total)}</div>
            </Card>
          </Link>
        ))}
      </div>
      {orders.length === 0 && <p className="text-sm text-slate-400">Không có đơn phù hợp.</p>}
    </div>
  );
}
