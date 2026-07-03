"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

export function SettingsForm({ settings, staff }: { settings: Record<string, any>; staff: any[] }) {
  const supabase = createClient();
  const [shop, setShop] = useState(settings.shop_info ?? { shop_name: "DN HOUSE", business_type: "", address: "", phone: "" });
  const [prefix, setPrefix] = useState<string>(settings.order_prefix ?? "DN");
  const [dueHours, setDueHours] = useState<number>(settings.default_due_hours ?? 48);
  const [review, setReview] = useState(settings.form_review ?? { staff_can_see: false });
  const [rows, setRows] = useState(staff);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveSetting(key: string, value: any) {
    await supabase.from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() });
    setMsg("Đã lưu.");
    setTimeout(() => setMsg(null), 2000);
  }
  async function setRole(id: string, role: string) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    setRows((p) => p.map((r) => r.id === id ? { ...r, role } : r));
  }
  async function setActive(id: string, active: boolean) {
    await supabase.from("profiles").update({ active }).eq("id", id);
    setRows((p) => p.map((r) => r.id === id ? { ...r, active } : r));
  }

  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  async function runBackup() {
    setBackupBusy(true); setBackupMsg(null);
    const res = await fetch("/api/backup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ upload: true }) });
    const json = await res.json().catch(() => ({}));
    setBackupMsg(res.ok ? "Đã tạo backup và tải lên Drive (Backups/)." : `Lỗi: ${json.error ?? res.statusText}`);
    setBackupBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle>Thông tin cửa hàng</CardTitle>
        <div><Label>Tên</Label><Input value={shop.shop_name} onChange={(e) => setShop({ ...shop, shop_name: e.target.value })} /></div>
        <div><Label>Loại hình</Label><Input value={shop.business_type} onChange={(e) => setShop({ ...shop, business_type: e.target.value })} /></div>
        <div><Label>Địa chỉ</Label><Input value={shop.address} onChange={(e) => setShop({ ...shop, address: e.target.value })} /></div>
        <div><Label>SĐT</Label><Input value={shop.phone} onChange={(e) => setShop({ ...shop, phone: e.target.value })} /></div>
        <Button onClick={() => saveSetting("shop_info", shop)}>Lưu thông tin cửa hàng</Button>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Đơn hàng & nhắc rà soát</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Tiền tố mã đơn</Label><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} /></div>
          <div><Label>Số giờ hẹn trả mặc định</Label><Input type="number" value={dueHours} onChange={(e) => setDueHours(Number(e.target.value))} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!review.staff_can_see}
            onChange={(e) => setReview({ ...review, staff_can_see: e.target.checked })} />
          Cho phép nhân viên thấy nhắc rà soát 6 tháng
        </label>
        <div className="flex gap-2">
          <Button onClick={() => saveSetting("order_prefix", prefix)}>Lưu tiền tố</Button>
          <Button variant="secondary" onClick={() => saveSetting("default_due_hours", dueHours)}>Lưu giờ hẹn</Button>
          <Button variant="secondary" onClick={() => saveSetting("form_review", review)}>Lưu nhắc rà soát</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Nhân viên</CardTitle>
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-t py-2 text-sm">
            <span>{r.full_name ?? r.id.slice(0, 8)}</span>
            <div className="flex items-center gap-2">
              <Select value={r.role} onChange={(e) => setRole(r.id, e.target.value)}>
                <option value="staff">staff</option><option value="admin">admin</option>
              </Select>
              <Button variant={r.active ? "secondary" : "ghost"} onClick={() => setActive(r.id, !r.active)}>
                {r.active ? "Đang hoạt động" : "Đã khoá"}
              </Button>
            </div>
          </div>
        ))}
      </Card>
      <Card className="space-y-3">
        <CardTitle>Backup / Xuất dữ liệu</CardTitle>
        <p className="text-sm text-slate-500">Xuất các bảng chính ra Excel + JSON và tải lên Google Drive (thư mục Backups). Token Drive không nằm trong backup.</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={backupBusy} onClick={runBackup}>Tạo backup & lên Drive</Button>
          <a href="/api/backup?download=1" onClick={(e) => { e.preventDefault(); fetch("/api/backup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ upload: false }) }).then(async (r) => { const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "backup.xlsx"; a.click(); URL.revokeObjectURL(u); }); }}>
            <Button variant="secondary">Tải backup Excel</Button>
          </a>
        </div>
        {backupMsg && <p className="text-sm text-slate-600">{backupMsg}</p>}
      </Card>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
