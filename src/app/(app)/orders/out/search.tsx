"use client";
import { useState } from "react";
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

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const term = q.trim();
    let query = supabase.from("orders").select("*").order("is_completed").order("received_at", { ascending: false }).limit(30);
    if (term) query = query.or(`order_no.ilike.%${term}%,customer_phone.ilike.%${term}%,customer_name.ilike.%${term}%`);
    else query = query.eq("is_completed", false);
    const { data } = await query;
    setRows((data ?? []) as Order[]);
    setBusy(false);
  }

  async function complete(id: string) {
    const note = window.prompt("Ghi chú hoàn thành (tuỳ chọn):") ?? "";
    const res = await fetch(`/api/orders/${id}/complete`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed_note: note }),
    });
    if (res.ok) setRows((prev) => prev.map((o) => o.id === id ? { ...o, is_completed: true } : o));
    else alert("Không thể cập nhật");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Mã đơn / SĐT / tên khách" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" disabled={busy}>Tìm</Button>
      </form>
      {rows.map((o) => (
        <Card key={o.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <div className="font-semibold">{o.order_no} — {o.customer_name ?? "khách lẻ"} {o.customer_phone ? `(${o.customer_phone})` : ""}</div>
            <div className="text-slate-500">{formatVnd(o.final_total)} · {o.is_completed ? "✅ Đã trả" : "⏳ Chưa trả"} · nhận {new Date(o.received_at).toLocaleDateString("vi-VN")}</div>
          </div>
          {!o.is_completed && <Button onClick={() => complete(o.id)}>Đã giao đồ / Hoàn thành đơn</Button>}
        </Card>
      ))}
      {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có kết quả.</p>}
    </div>
  );
}
