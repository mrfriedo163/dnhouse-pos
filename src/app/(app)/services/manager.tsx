"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Service } from "@/lib/types";

const UNITS = ["kg", "cái", "đôi", "bộ", "lần", "món", "custom"];

type EditableField = "name" | "unit_type" | "default_price" | "active";

export function ServicesManager({ initial }: { initial: Service[] }) {
  const [rows, setRows] = useState<Service[]>(initial);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  function patchRow(id: string, patch: Partial<Service>) {
    setRows((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function saveRow(id: string, patch: Partial<Pick<Service, EditableField>>) {
    setSavingId(id);
    setMessage(null);
    const { error } = await supabase.from("services").update(patch).eq("id", id);
    setSavingId(null);

    if (error) {
      setMessage(`Chưa lưu được thay đổi: ${error.message}`);
      return false;
    }

    setMessage("Đã lưu dịch vụ.");
    return true;
  }

  async function add() {
    const cleanName = name.trim();
    if (!cleanName) return;

    setMessage(null);
    const { data, error } = await supabase
      .from("services")
      .insert({ name: cleanName, unit_type: unit, default_price: price, active: true })
      .select("*")
      .single();

    if (error) {
      setMessage(`Chưa thêm được dịch vụ: ${error.message}`);
      return;
    }

    if (data) {
      setRows((prev) => [...prev, data as Service].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setPrice(0);
      setMessage("Đã thêm dịch vụ.");
    }
  }

  async function toggle(service: Service) {
    const next = !service.active;
    patchRow(service.id, { active: next });
    const ok = await saveRow(service.id, { active: next });
    if (!ok) patchRow(service.id, { active: service.active });
  }

  async function saveName(service: Service) {
    const next = service.name.trim();
    if (!next) {
      setMessage("Tên dịch vụ không được để trống.");
      return;
    }

    patchRow(service.id, { name: next });
    await saveRow(service.id, { name: next });
  }

  async function saveUnit(service: Service, value: string) {
    patchRow(service.id, { unit_type: value });
    await saveRow(service.id, { unit_type: value });
  }

  async function savePrice(service: Service) {
    const value = Number(service.default_price || 0);
    patchRow(service.id, { default_price: value });
    await saveRow(service.id, { default_price: value });
  }

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 sm:grid-cols-4 sm:items-end">
        <div className="sm:col-span-2">
          <Label>Tên dịch vụ mới</Label>
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

      {message ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-navy">
          {message}
        </div>
      ) : null}

      <div className="space-y-2">
        {rows.map((service) => (
          <Card key={service.id} className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_140px_160px_110px] lg:items-end">
            <div>
              <Label>Tên dịch vụ</Label>
              <Input
                value={service.name}
                className="border-sky-200 bg-sky-50/70 font-semibold"
                onChange={(event) => patchRow(service.id, { name: event.target.value })}
                onBlur={() => saveName(service)}
              />
            </div>

            <div>
              <Label>Đơn vị</Label>
              <Select
                value={service.unit_type}
                className="border-sky-200 bg-sky-50/70 font-semibold"
                onChange={(event) => saveUnit(service, event.target.value)}
              >
                {UNITS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Giá</Label>
              <Input
                type="number"
                value={service.default_price}
                className="border-sky-200 bg-sky-50/70 font-semibold"
                onChange={(event) => patchRow(service.id, { default_price: Number(event.target.value) })}
                onBlur={() => savePrice(service)}
              />
            </div>

            <Button variant={service.active ? "secondary" : "ghost"} onClick={() => toggle(service)}>
              {savingId === service.id ? "Đang lưu" : service.active ? "Đang bật" : "Đã tắt"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
