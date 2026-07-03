"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { Service } from "@/lib/types";

const UNITS = ["kg", "cái", "đôi", "bộ", "lần", "custom"];

export function ServicesManager({ initial }: { initial: Service[] }) {
  const [rows, setRows] = useState<Service[]>(initial);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);
  const supabase = createClient();

  async function add() {
    if (!name) return;
    const { data } = await supabase.from("services").insert({ name, unit_type: unit, default_price: price, active: true }).select("*").single();
    if (data) { setRows((p) => [...p, data as Service]); setName(""); setPrice(0); }
  }
  async function toggle(s: Service) {
    await supabase.from("services").update({ active: !s.active }).eq("id", s.id);
    setRows((p) => p.map((x) => x.id === s.id ? { ...x, active: !x.active } : x));
  }
  async function updatePrice(s: Service, v: number) {
    await supabase.from("services").update({ default_price: v }).eq("id", s.id);
    setRows((p) => p.map((x) => x.id === s.id ? { ...x, default_price: v } : x));
  }

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 sm:grid-cols-4 sm:items-end">
        <div className="sm:col-span-2"><Label>Tên dịch vụ</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Đơn vị</Label><Select value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select></div>
        <div><Label>Giá mặc định</Label><Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
        <Button onClick={add} className="sm:col-span-4">+ Thêm dịch vụ</Button>
      </Card>
      <div className="space-y-2">
        {rows.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-2">
            <div><span className="font-medium">{s.name}</span> <span className="text-slate-400">/ {s.unit_type}</span></div>
            <div className="flex items-center gap-2">
              <Input type="number" defaultValue={s.default_price} className="w-32" onBlur={(e) => updatePrice(s, Number(e.target.value))} />
              <Button variant={s.active ? "secondary" : "ghost"} onClick={() => toggle(s)}>{s.active ? "Đang bật" : "Đã tắt"}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
