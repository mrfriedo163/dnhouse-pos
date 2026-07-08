"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/types";

const UNITS = ["kg", "cái", "đôi", "bộ", "lần", "món", "custom"];

export function ServicesManager({ initial }: { initial: Service[] }) {
  const [rows, setRows] = useState<Service[]>(initial);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);
  const supabase = createClient();

  async function add() {
    const cleanName = name.trim();
    if (!cleanName) return;

    const { data } = await supabase
      .from("services")
      .insert({ name: cleanName, unit_type: unit, default_price: price, active: true })
      .select("*")
      .single();

    if (data) {
      setRows((prev) => [...prev, data as Service].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setPrice(0);
    }
  }

  async function toggle(service: Service) {
    await supabase.from("services").update({ active: !service.active }).eq("id", service.id);
    setRows((prev) => prev.map((item) => (item.id === service.id ? { ...item, active: !item.active } : item)));
  }

  async function updateName(service: Service, value: string) {
    const next = value.trim();
    if (!next || next === service.name) return;

    await supabase.from("services").update({ name: next }).eq("id", service.id);
    setRows((prev) => prev.map((item) => (item.id === service.id ? { ...item, name: next } : item)));
  }

  async function updateUnit(service: Service, value: string) {
    if (!value || value === service.unit_type) return;

    await supabase.from("services").update({ unit_type: value }).eq("id", service.id);
    setRows((prev) => prev.map((item) => (item.id === service.id ? { ...item, unit_type: value } : item)));
  }

  async function updatePrice(service: Service, value: number) {
    await supabase.from("services").update({ default_price: value }).eq("id", service.id);
    setRows((prev) => prev.map((item) => (item.id === service.id ? { ...item, default_price: value } : item)));
  }

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 sm:grid-cols-4 sm:items-end">
        <div className="sm:col-span-2">
          <Label>Tên dịch vụ</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <Label>Đơn vị</Label>
          <Select value={unit} onChange={(event) => setUnit(event.target.value)}>
            {UNITS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Giá mặc định</Label>
          <Input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
        </div>
        <Button onClick={add} className="sm:col-span-4">+ Thêm dịch vụ</Button>
      </Card>

      <div className="space-y-2">
        {rows.map((service) => (
          <Card key={service.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_120px]">
              <div>
                <Label className="sr-only">Tên dịch vụ</Label>
                <Input
                  defaultValue={service.name}
                  className="font-semibold"
                  onBlur={(event) => updateName(service, event.target.value)}
                />
              </div>
              <div>
                <Label className="sr-only">Đơn vị</Label>
                <Select defaultValue={service.unit_type} onChange={(event) => updateUnit(service, event.target.value)}>
                  {UNITS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Input
                type="number"
                defaultValue={service.default_price}
                className="w-32"
                onBlur={(event) => updatePrice(service, Number(event.target.value))}
              />
              <Button variant={service.active ? "secondary" : "ghost"} onClick={() => toggle(service)}>
                {service.active ? "Đang bật" : "Đã tắt"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
