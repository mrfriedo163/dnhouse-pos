"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function thisMonth() {
  return today().slice(0, 7);
}

export function ReportsPanel() {
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(thisMonth());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function gen(kind: "daily" | "monthly", upload: boolean) {
    setBusy(true);
    setMsg(null);
    const body = kind === "daily" ? { date, upload } : { month, upload };
    const res = await fetch(`/api/reports/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!upload) {
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${kind}-${kind === "daily" ? date : month}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        setMsg("Đã tải file Excel.");
      } else {
        const json = await res.json().catch(() => ({}));
        setMsg(`Lỗi: ${json.error ?? res.statusText}`);
      }
    } else {
      const json = await res.json().catch(() => ({}));
      setMsg(res.ok ? `Đã cập nhật Drive: ${json.name ?? "file"}` : `Lỗi: ${json.error ?? res.statusText}`);
    }

    setBusy(false);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-3">
        <CardTitle>Báo cáo ngày</CardTitle>
        <div>
          <Label>Ngày</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <p className="text-sm text-slate-500">
          Bấm cập nhật Drive sẽ ghi vào file tháng, mỗi ngày là một tab riêng.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => gen("daily", false)}>
            Tải Excel ngày
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => gen("daily", true)}>
            Cập nhật file tháng trên Drive
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Báo cáo tháng</CardTitle>
        <div>
          <Label>Tháng</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <p className="text-sm text-slate-500">
          Dùng khi cần xuất riêng báo cáo tổng tháng.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => gen("monthly", false)}>
            Tải Excel tháng
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => gen("monthly", true)}>
            Lưu báo cáo tháng lên Drive
          </Button>
        </div>
      </Card>

      {msg && <p className="text-sm text-slate-600 md:col-span-2">{msg}</p>}
    </div>
  );
}
