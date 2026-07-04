"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DriveActions({
  connected,
  configured,
  rootUrl,
}: {
  connected: boolean;
  configured: boolean;
  rootUrl: string | null;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function test() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/drive/test", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Test upload OK: ${json.name ?? "file"}` : `Lỗi: ${json.error ?? res.statusText}`);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {configured ? (
        <a href="/api/drive/connect">
          <Button>{connected ? "Kết nối lại Google Drive" : "Kết nối Google Drive"}</Button>
        </a>
      ) : (
        <Button disabled>Kết nối Google Drive</Button>
      )}

      {connected && (
        <Button variant="secondary" disabled={busy} onClick={test}>
          Test Upload
        </Button>
      )}

      {rootUrl && (
        <a href={rootUrl} target="_blank" rel="noreferrer">
          <Button variant="ghost">Mở thư mục DN House</Button>
        </a>
      )}

      {!configured && (
        <span className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Chưa cấu hình Google OAuth trên Vercel. Tính năng Drive sẽ bật sau khi thêm GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI và DRIVE_TOKEN_ENC_KEY.
        </span>
      )}

      {msg && <span className="w-full text-sm text-slate-600">{msg}</span>}
    </div>
  );
}
