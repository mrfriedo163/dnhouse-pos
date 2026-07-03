"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { BILL_VARIABLES } from "@/lib/types";
import { arrayBufferToBase64 } from "@/lib/base64";

export function TemplatesManager({ initial }: { initial: any[] }) {
  const [rows, setRows] = useState<any[]>(initial);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [warning, setWarning] = useState<string | null>(null);
  const [fileB64, setFileB64] = useState<string | null>(null);
  const [origName, setOrigName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setOrigName(f.name);
    const buf = await f.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    setFileB64(b64);
    setWarning(null);
    const res = await fetch("/api/templates/inspect", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pdfBase64: b64 }),
    });
    const json = await res.json();
    if (!res.ok) { setWarning(json.error ?? "Không đọc được PDF"); setFields([]); return; }
    if (!json.fields || json.fields.length === 0) {
      setWarning("This PDF has no fillable fields. Please provide a fillable PDF form or implement coordinate-based mapping in phase 2.");
      setFields([]);
    } else {
      setFields(json.fields.map((f: any) => f.name));
    }
  }

  async function save() {
    if (!name || !fileB64) return;
    setBusy(true);
    const res = await fetch("/api/templates/inspect", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, pdfBase64: fileB64, original_file_name: origName, field_mapping: mapping }),
    });
    const json = await res.json();
    setBusy(false);
    if (res.ok) { setRows((p) => [json.template, ...p]); setName(""); setFileB64(null); setFields([]); setMapping({}); }
    else alert(json.error ?? "Lưu thất bại");
  }

  async function setActive(id: string) {
    await supabase.from("pdf_templates").update({ active: false }).eq("template_type", "bill");
    await supabase.from("pdf_templates").update({ active: true }).eq("id", id);
    setRows((p) => p.map((r) => ({ ...r, active: r.id === id })));
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle>Tải mẫu PDF mới</CardTitle>
        <div><Label>Tên mẫu</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>File PDF (nên có form field)</Label><input type="file" accept="application/pdf" onChange={onFile} /></div>
        {warning && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{warning}</p>}
        {fields.length > 0 && (
          <div className="space-y-2">
            <Label>Map field PDF → biến đơn hàng</Label>
            {fields.map((f) => (
              <div key={f} className="grid grid-cols-2 gap-2">
                <span className="self-center text-sm">{f}</span>
                <Select value={mapping[f] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value }))}>
                  <option value="">-- bỏ qua --</option>
                  {BILL_VARIABLES.map((v) => <option key={v} value={v}>{v}</option>)}
                </Select>
              </div>
            ))}
          </div>
        )}
        <Button disabled={busy || !fileB64 || !name} onClick={save}>Lưu mẫu</Button>
      </Card>

      <div className="space-y-2">
        {rows.map((t) => (
          <Card key={t.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{t.name} {t.active && <span className="text-emerald-600">(đang dùng)</span>}</div>
              <div className="text-xs text-slate-400">{t.original_file_name} · {Object.keys(t.field_mapping ?? {}).length} field mapped</div>
            </div>
            {!t.active && <Button variant="secondary" onClick={() => setActive(t.id)}>Đặt làm mẫu chính</Button>}
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">Chưa có mẫu nào.</p>}
      </div>
    </div>
  );
}
