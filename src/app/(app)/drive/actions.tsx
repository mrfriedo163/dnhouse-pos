"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DriveActions({ connected, rootUrl }: { connected: boolean; rootUrl: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function test() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/drive/test", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Test upload OK: ${json.name ?? "file"}` : `Lỗi: ${json.error ?? res.statusText}`);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a href="/api/drive/connect"><Button>{connected ? "Kết nối lại Google Drive" : "Kết nối Google Drive"}</Button></a>
      {connected && <Button variant="secondary" disabled={busy} onClick={test}>Test Upload</Button>}
      {rootUrl && <a href={rootUrl} target="_blank" rel="noreferrer"><Button variant="ghost">Mở thư mục DN House</Button></a>}
      {msg && <span className="w-full text-sm text-slate-600">{msg}</span>}
    </div>
  );
}
