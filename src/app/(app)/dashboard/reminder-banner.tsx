"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReminderBanner({ driveFolderUrl }: { driveFolderUrl: string | null }) {
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  async function act(action: "reviewed" | "snooze") {
    setBusy(true);
    await fetch("/api/form-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    setHidden(true);
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="font-medium text-amber-900">
        Đã đến hạn rà soát biểu mẫu/kê khai. Hãy kiểm tra lại quy định, mẫu biểu và thông báo mới để tránh sai lệch thông tin.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" disabled={busy} onClick={() => act("reviewed")}>
          Đã rà soát, nhắc lại sau 6 tháng
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => act("snooze")}>
          Nhắc lại sau 7 ngày
        </Button>
        {driveFolderUrl && (
          <a href={driveFolderUrl} target="_blank" rel="noreferrer">
            <Button variant="ghost">Mở thư mục Declaration Drafts</Button>
          </a>
        )}
        <a href="/declarations"><Button variant="ghost">Tạo ghi chú rà soát</Button></a>
      </div>
    </div>
  );
}
