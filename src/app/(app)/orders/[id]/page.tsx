import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/calc";
import { PrintButtons } from "./print-buttons";
import { AdminOrderActions } from "./admin-actions";
import { getCurrentProfile } from "@/lib/auth";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderDetail({
  params, searchParams,
}: { params: { id: string }; searchParams: { created?: string; drive?: string } }) {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  const { data: order } = await supabase.from("orders").select("*").eq("id", params.id).maybeSingle();
  if (!order) notFound();
  const o = order as Order;
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", o.id);
  const isDeleted = Boolean(o.deleted_at);

  return (
    <div className="space-y-4">
      {searchParams.created && !isDeleted && (
        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">Đã tạo đơn {o.order_no}.</div>
      )}
      {searchParams.drive === "fail" && !isDeleted && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
          Tải bill lên Google Drive thất bại. Đơn vẫn được lưu.
          <form action={`/api/orders/${o.id}/bill-retry`} method="post" className="mt-2">
            <Button type="submit" variant="secondary">Thử tải lại lên Drive</Button>
          </form>
        </div>
      )}
      {isDeleted && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          Đơn này đã được đánh dấu xóa lúc {new Date(o.deleted_at!).toLocaleString("vi-VN")}. Dòng dữ liệu vẫn được giữ để đối soát, nhưng không tính vào doanh thu/báo cáo.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Đơn {o.order_no}</h1>
        <Link href="/orders" className="text-sm text-slate-500 underline">← Danh sách</Link>
      </div>

      <Card>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>Khách: <b>{o.customer_name ?? "-"}</b></div>
          <div>SĐT: <b>{o.customer_phone ?? "-"}</b></div>
          <div>Nhận lúc: {new Date(o.received_at).toLocaleString("vi-VN")}</div>
          <div>Hẹn trả: {o.due_at ? new Date(o.due_at).toLocaleString("vi-VN") : "-"}</div>
          <div>Trạng thái: {isDeleted ? "Đã xóa" : o.is_completed ? "Đã trả" : "Chưa trả"}</div>
        </div>
      </Card>

      <Card>
        <CardTitle>Dịch vụ</CardTitle>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th>Dịch vụ</th>
              <th>SL</th>
              <th>Đơn giá</th>
              <th className="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it: any) => (
              <tr key={it.id} className="border-t">
                <td>{it.service_name_snapshot}</td>
                <td>{it.quantity} {it.unit_type}</td>
                <td>{formatVnd(it.unit_price)}</td>
                <td className="text-right">{formatVnd(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 space-y-1 border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Tạm tính</span><span>{formatVnd(o.subtotal)}</span></div>
          <div className="flex justify-between"><span>Giảm</span><span>- {formatVnd(o.discount_total)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Tổng</span><span>{formatVnd(o.final_total)}</span></div>
        </div>
      </Card>

      {!isDeleted && <PrintButtons billUrl={o.bill_drive_web_url} orderId={o.id} />}
      {profile?.role === "admin" && !isDeleted && <AdminOrderActions orderId={o.id} isCompleted={o.is_completed} />}
    </div>
  );
}
