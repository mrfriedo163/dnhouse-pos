"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { computeOrderTotals, formatVnd } from "@/lib/calc";
import type { DiscountType, Service, Order } from "@/lib/types";

interface Line { key: string; service_id: string | null; name: string; unit_type: string; quantity: number; unit_price: number; }
let c = 0;

export function EditOrderForm({ order, items, services }: { order: Order; items: any[]; services: Service[] }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(order.customer_name ?? "");
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone ?? "");
  const [dueAt, setDueAt] = useState(order.due_at ? order.due_at.slice(0, 16) : "");
  const [note, setNote] = useState(order.note ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(order.discount_type);
  const [discountValue, setDiscountValue] = useState(order.discount_value);
  const [lines, setLines] = useState<Line[]>(items.map((it) => ({
    key: `l${++c}`, service_id: it.service_id, name: it.service_name_snapshot,
    unit_type: it.unit_type ?? "", quantity: Number(it.quantity), unit_price: Number(it.unit_price),
  })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => computeOrderTotals(lines.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price })), discountType, discountValue), [lines, discountType, discountValue]);
  const set = (k: string, p: Partial<Line>) => setLines((prev) => prev.map((l) => l.key === k ? { ...l, ...p } : l));
  function pick(k: string, id: string) { const s = services.find((x) => x.id === id); if (s) set(k, { service_id: s.id, name: s.name, unit_type: s.unit_type, unit_price: s.default_price }); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const payload = {
      customer_name: customerName || null, customer_phone: customerPhone || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      discount_type: discountType, discount_value: discountValue, note: note || null,
      items: lines.filter((l) => l.name && l.quantity > 0).map((l) => ({
        service_id: l.service_id, service_name_snapshot: l.name, unit_type: l.unit_type || null, quantity: l.quantity, unit_price: l.unit_price,
      })),
    };
    setSaving(true);
    const res = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { router.push(`/orders/${order.id}`); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); setError(j.error ?? "Lưu thất bại"); setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-2">
        <div><Label>Tên khách</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
        <div><Label>SĐT</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
        <div><Label>Hẹn trả</Label><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
      </Card>
      <Card className="space-y-2">
        {lines.map((l) => (
          <div key={l.key} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-4"><Label>Dịch vụ</Label>
              <Select value={l.service_id ?? ""} onChange={(e) => pick(l.key, e.target.value)}>
                <option value="">-- {l.name || "chọn"} --</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.unit_type})</option>)}
              </Select></div>
            <div className="sm:col-span-2"><Label>SL</Label><Input type="number" min={0} step="0.1" value={l.quantity} onChange={(e) => set(l.key, { quantity: Number(e.target.value) })} /></div>
            <div className="sm:col-span-3"><Label>Đơn giá</Label><Input type="number" min={0} value={l.unit_price} onChange={(e) => set(l.key, { unit_price: Number(e.target.value) })} /></div>
            <div className="sm:col-span-2 text-sm">{formatVnd(l.quantity * l.unit_price)}</div>
            <div className="sm:col-span-1"><Button type="button" variant="ghost" onClick={() => setLines((p) => p.length > 1 ? p.filter((x) => x.key !== l.key) : p)}>✕</Button></div>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setLines((p) => [...p, { key: `l${++c}`, service_id: null, name: "", unit_type: "", quantity: 1, unit_price: 0 }])}>+ Thêm dịch vụ</Button>
      </Card>
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Giảm giá</Label>
            <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
              <option value="none">Không</option><option value="percent">%</option><option value="fixed">Cố định</option>
            </Select></div>
          {discountType !== "none" && <div><Label>Giá trị</Label><Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} /></div>}
        </div>
        <div><Label>Ghi chú</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div className="flex justify-between text-lg font-bold"><span>Tổng</span><span>{formatVnd(totals.final_total)}</span></div>
      </Card>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></div>
    </form>
  );
}
