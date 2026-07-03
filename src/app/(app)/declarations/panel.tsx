"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { arrayBufferToBase64 } from "@/lib/base64";

function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()); }

const FIELDS = ["received_at", "order_no", "customer_name", "customer_phone", "services_summary", "subtotal", "discount_total", "final_total", "note", "created_by"];

export function DeclarationsPanel({ templates }: { templates: any[] }) {
  const [from, setFrom] = useState(today().slice(0, 8) + "01");
  const [to, setTo] = useState(today());
  const [templateId, setTemplateId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // template upload state
  const [rows, setRows] = useState<any[]>(templates);
  const [name, setName] = useState("");
  const [xlsxB64, setXlsxB64] = useState<string | null>(null);
  const [origName, setOrigName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [sheet, setSheet] = useState("");
  const [startRow, setStartRow] = useState(2);
  const [columns, setColumns] = useState<Record<string, string>>({});
  const [warn, setWarn] = useState<string | null>(null);
  const supabase = createClient();

  async function run(upload: boolean) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/declarations/export", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to, upload, templateId: templateId || undefined }),
    });
    if (!upload && res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `declaration-${from}_${to}.xlsx`; a.click();
      URL.revokeObjectURL(url); setMsg("Đã tải file nháp.");
    } else {
      const json = await res.json().catch(() => ({}));
      setMsg(res.ok ? `Đã tải lên Drive: ${json.name ?? "file"}` : `Lỗi: ${json.error ?? res.statusText}`);
    }
    setBusy(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setOrigName(f.name); setWarn(null);
    const b64 = arrayBufferToBase64(await f.arrayBuffer());
    setXlsxB64(b64);
    const res = await fetch("/api/declarations/template", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ xlsxBase64: b64 }),
    });
    const json = await res.json();
    if (!res.ok) { setWarn(json.error ?? "Không đọc được Excel"); return; }
    setSheets(json.sheets.map((s: any) => s.name));
    setSheet(json.sheets[0]?.name ?? "");
  }

  async function saveTemplate() {
    if (!name || !xlsxB64) return;
    const mapping_json = { sheet, startRow, columns };
    const res = await fetch("/api/declarations/template", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, xlsxBase64: xlsxB64, original_file_name: origName, mapping_json }),
    });
    const json = await res.json();
    if (res.ok) { setRows((p) => [json.template, ...p]); setName(""); setXlsxB64(null); setSheets([]); setColumns({}); setMsg("Đã lưu template."); }
    else setMsg(json.error ?? "Lưu template thất bại");
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle>Xuất số liệu theo khoảng ngày (received_at)</CardTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <div><Label>Từ ngày</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Đến ngày</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div>
          <Label>Mẫu Excel (tuỳ chọn)</Label>
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">-- Không dùng mẫu (xuất bảng mặc định) --</option>
            {rows.filter((t) => t.drive_file_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => run(false)}>Tải Excel nháp</Button>
          <Button variant="secondary" disabled={busy} onClick={() => run(true)}>Tạo & lên Drive (Declaration Drafts)</Button>
        </div>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </Card>

      <Card className="space-y-3">
        <CardTitle>Mẫu Excel kê khai (tải lên & map)</CardTitle>
        <div><Label>Tên mẫu</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>File .xlsx</Label><input type="file" accept=".xlsx" onChange={onFile} /></div>
        {warn && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{warn}</p>}
        {sheets.length > 0 && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label>Sheet</Label><Select value={sheet} onChange={(e) => setSheet(e.target.value)}>{sheets.map((s) => <option key={s}>{s}</option>)}</Select></div>
              <div><Label>Dòng bắt đầu ghi dữ liệu</Label><Input type="number" min={1} value={startRow} onChange={(e) => setStartRow(Number(e.target.value))} /></div>
            </div>
            <Label>Map trường → cột (chữ cái, vd A, B, C)</Label>
            {FIELDS.map((f) => (
              <div key={f} className="grid grid-cols-2 gap-2">
                <span className="self-center text-sm">{f}</span>
                <Input placeholder="Cột (A/B/C...)" value={columns[f] ?? ""} onChange={(e) => setColumns((m) => ({ ...m, [f]: e.target.value.toUpperCase() }))} />
              </div>
            ))}
            <Button onClick={saveTemplate} disabled={!name || !xlsxB64}>Lưu mẫu</Button>
          </>
        )}
        <div className="space-y-1 border-t pt-2">
          {rows.map((t) => (
            <div key={t.id} className="flex justify-between text-sm">
              <span>{t.name} {t.drive_file_id ? "" : "(chưa lưu Drive)"}</span>
              <span className="text-slate-400">{Object.keys((t.mapping_json?.columns) ?? {}).length} cột map</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
