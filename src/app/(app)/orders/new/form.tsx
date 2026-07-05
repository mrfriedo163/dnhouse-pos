"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { computeOrderTotals, formatVnd } from "@/lib/calc";
import type { DiscountType, Service } from "@/lib/types";

interface Line {
  key: string;
  service_id: string | null;
  name: string;
  unit_type: string;
  quantity: number;
  quantityText: string;
  unit_price: number;
}

let lineCounter = 0;

function parseVietnameseNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function newLine(): Line {
  return { key: `l${++lineCounter}`, service_id: null, name: "", unit_type: "", quantity: 1, quantityText: "1", unit_price: 0 };
}

export function NewOrderForm({ services }: { services: Service[] }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => computeOrderTotals(lines.map((line) => ({ quantity: line.quantity, unit_price: line.unit_price })), discountType, discountValue),
    [lines, discountType, discountValue],
  );

  function setLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function setQuantity(key: string, value: string) {
    setLine(key, { quantityText: value, quantity: parseVietnameseNumber(value) });
  }

  function pickService(key: string, serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    if (!service) {
      setLine(key, { service_id: null });
      return;
    }
    setLine(key, { service_id: service.id, name: service.name, unit_type: service.unit_type, unit_price: service.default_price });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const items = lines
      .filter((line) => line.name && line.quantity > 0)
      .map((line) => ({
        service_id: line.service_id,
        service_name_snapshot: line.name,
        unit_type: line.unit_type || null,
        quantity: line.quantity,
        unit_price: line.unit_price,
      }));

    if (items.length === 0) {
      setError("Cần ít nhất 1 dịch vụ.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          discount_type: discountType,
          discount_value: discountValue,
          note: note || null,
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Lưu đơn thất bại");
      router.push(`/orders/${json.order.id}?created=1${json.driveWarning ? "&drive=fail" : ""}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Lỗi");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Tên khách</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div><Label>Số điện thoại</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="tel" /></div>
          <div><Label>Hẹn trả</Label><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
        </div>
      </Card>

      <Card className="space-y-3">
        <Label>Dịch vụ</Label>
        {lines.map((line) => (
          <div key={line.key} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-4">
              <Label>Dịch vụ</Label>
              <Select value={line.service_id ?? ""} onChange={(e) => pickService(line.key, e.target.value)}>
                <option value="">-- chọn --</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.unit_type})</option>)}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>SL</Label>
              <Input
                inputMode="decimal"
                value={line.quantityText}
                placeholder="VD: 4,3"
                onChange={(e) => setQuantity(line.key, e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <Label>Đơn giá</Label>
              <Input type="number" min={0} step="1000" value={line.unit_price} onChange={(e) => setLine(line.key, { unit_price: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2 text-sm text-slate-600">{formatVnd(line.quantity * line.unit_price)}</div>
            <div className="sm:col-span-1">
              <Button type="button" variant="ghost" onClick={() => setLines((prev) => prev.length > 1 ? prev.filter((item) => item.key !== line.key) : prev)}>x</Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setLines((prev) => [...prev, newLine()])}>+ Thêm dịch vụ</Button>
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Loại giảm giá</Label>
            <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
              <option value="none">Không</option>
              <option value="percent">Phần trăm %</option>
              <option value="fixed">Số tiền cố định</option>
            </Select>
          </div>
          {discountType !== "none" && (
            <div>
              <Label>Giá trị giảm</Label>
              <Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
            </div>
          )}
        </div>
        <div><Label>Ghi chú</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>

        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between"><span>Tạm tính</span><span>{formatVnd(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span>Giảm</span><span>- {formatVnd(totals.discount_total)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Tổng cộng</span><span>{formatVnd(totals.final_total)}</span></div>
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu đơn & tạo bill"}</Button>
      </div>
      <p className="text-xs text-slate-400">Doanh thu được tính ngay khi tạo đơn theo ngày nhận.</p>
    </form>
  );
}
