"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { computeOrderTotals, formatVnd } from "@/lib/calc";
import type { DiscountType, Service, Order } from "@/lib/types";

interface Line {
  key: string;
  service_id: string | null;
  name: string;
  unit_type: string;
  quantity: number;
  quantityText: string;
  unit_price: number;
}

let counter = 0;

function parseVietnameseNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function emptyLine(): Line {
  return { key: `l${++counter}`, service_id: null, name: "", unit_type: "", quantity: 1, quantityText: "1", unit_price: 0 };
}

export function EditOrderForm({ order, items, services }: { order: Order; items: any[]; services: Service[] }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(order.customer_name ?? "");
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone ?? "");
  const [dueAt, setDueAt] = useState(order.due_at ? order.due_at.slice(0, 16) : "");
  const [note, setNote] = useState(order.note ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(order.discount_type);
  const [discountValue, setDiscountValue] = useState(order.discount_value);
  const [lines, setLines] = useState<Line[]>(items.map((item) => {
    const quantity = Number(item.quantity);
    return {
      key: `l${++counter}`,
      service_id: item.service_id,
      name: item.service_name_snapshot,
      unit_type: item.unit_type ?? "",
      quantity,
      quantityText: formatQuantity(quantity),
      unit_price: Number(item.unit_price),
    };
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => computeOrderTotals(lines.map((line) => ({ quantity: line.quantity, unit_price: line.unit_price })), discountType, discountValue),
    [lines, discountType, discountValue],
  );

  function setLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  function setQuantity(key: string, value: string) {
    setLine(key, { quantityText: value, quantity: parseVietnameseNumber(value) });
  }

  function pickService(key: string, id: string) {
    const service = services.find((item) => item.id === id);
    if (!service) return;
    setLine(key, { service_id: service.id, name: service.name, unit_type: service.unit_type, unit_price: service.default_price });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      discount_type: discountType,
      discount_value: discountValue,
      note: note || null,
      items: lines.filter((line) => line.name && line.quantity > 0).map((line) => ({
        service_id: line.service_id,
        service_name_snapshot: line.name,
        unit_type: line.unit_type || null,
        quantity: line.quantity,
        unit_price: line.unit_price,
      })),
    };

    setSaving(true);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push(`/orders/${order.id}`);
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Lưu thất bại");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-2">
        <div><Label>Tên khách</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
        <div><Label>SĐT</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
        <div><Label>Ngày hẹn</Label><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
      </Card>

      <Card className="space-y-2">
        {lines.map((line) => (
          <div key={line.key} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-4">
              <Label>Dịch vụ</Label>
              <Select value={line.service_id ?? ""} onChange={(e) => pickService(line.key, e.target.value)}>
                <option value="">-- {line.name || "chọn"} --</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.unit_type})</option>)}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>SL / kg</Label>
              <Input inputMode="decimal" value={line.quantityText} placeholder="VD: 4,3" onChange={(e) => setQuantity(line.key, e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <Label>Đơn giá</Label>
              <Input type="number" min={0} value={line.unit_price} onChange={(e) => setLine(line.key, { unit_price: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2 text-sm">{formatVnd(line.quantity * line.unit_price)}</div>
            <div className="sm:col-span-1"><Button type="button" variant="ghost" onClick={() => setLines((prev) => prev.length > 1 ? prev.filter((item) => item.key !== line.key) : prev)}>x</Button></div>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => setLines((prev) => [...prev, emptyLine()])}>+ Thêm dịch vụ</Button>
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Giảm giá</Label>
            <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
              <option value="none">Không</option>
              <option value="percent">%</option>
              <option value="fixed">Cố định</option>
            </Select>
          </div>
          {discountType !== "none" && (
            <div><Label>Giá trị</Label><Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} /></div>
          )}
        </div>
        <div><Label>Ghi chú</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div className="flex justify-between text-lg font-bold"><span>Tổng</span><span>{formatVnd(totals.final_total)}</span></div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button>
    </form>
  );
}
