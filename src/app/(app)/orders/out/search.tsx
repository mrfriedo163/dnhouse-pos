"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatVnd } from "@/lib/calc";
import type { Order } from "@/lib/types";

export function OutSearch() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false);

  async function load(term = q.trim()) {
    setBusy(true);
    const supabase = createClient();
    let query = supabase
      .from("orders")
      .select("*")
      .is("deleted_at", null)
      .order("received_at", { ascending: false })
      .limit(50);

    if (term) {
      query = query.or(`order_no.ilike.%${term}%,customer_phone.ilike.%${term}%,customer_name.ilike.%${term}%`);
    } else {
      query = query.eq("is_completed", false);
    }

    const { data } = await query;
    setRows((data ?? []) as Order[]);
    setBusy(false);
  }

  useEffect(() => {
    void load("");
    // Load pending orders once when the OUT screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    await load(q.trim());
  }

  async function complete(id: string) {
    setBusy(true);
    const res = await fetch(`/api/orders/${id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed_note: "" }),
    });
    setBusy(false);
    if (res.ok) {
      setRows((prev) => prev.filter((order) => order.id !== id));
    } else {
      alert("Không thể cập nhật đơn. Vui lòng thử lại.");
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Mã đơn / SĐT / tên khách" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" disabled={busy}>{busy ? "Đang tải..." : "Tìm"}</Button>
        {q.trim() && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setQ("");
              void load("");
            }}
          >
            Đơn chưa trả
          </Button>
        )}
      </form>

      <div className="text-sm font-bold text-navy">
        {q.trim() ? "Kết quả tìm kiếm" : "Đơn chưa trả"}
      </div>

      {rows.map((order) => (
        <Card key={order.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <div className="font-semibold">
              {order.order_no} - {order.customer_name ?? "khách lẻ"} {order.customer_phone ? `(${order.customer_phone})` : ""}
            </div>
            <div className="text-slate-500">
              {formatVnd(order.final_total)} · {order.is_completed ? "Đã trả" : "Chưa trả"} · nhận {new Date(order.received_at).toLocaleDateString("vi-VN")}
            </div>
          </div>
          {!order.is_completed && (
            <Button disabled={busy} onClick={() => complete(order.id)}>
              Đã trả đồ
            </Button>
          )}
        </Card>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-slate-400">
          {q.trim() ? "Không tìm thấy đơn phù hợp." : "Không còn đơn chưa trả."}
        </p>
      )}
    </div>
  );
}
