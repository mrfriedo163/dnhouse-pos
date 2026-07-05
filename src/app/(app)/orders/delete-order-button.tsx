"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteOrderButton({ orderId, orderNo }: { orderId: string; orderNo: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const reason = window.prompt(`Lý do xóa bill ${orderNo}?`, "Nhập sai thông tin khách");
    if (reason === null) return;

    const ok = window.confirm(
      `Đánh dấu xóa bill ${orderNo}?\n\nBill sẽ ẩn khỏi báo cáo và kê khai, nhưng vẫn giữ lại trong data để đối soát.`,
    );
    if (!ok) return;

    setDeleting(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delete_reason: reason.trim() || "Quản lý đánh dấu xóa trên POS" }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body?.error ?? "Không thể đánh dấu xóa bill.");
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="danger"
      className="min-h-9 px-3 py-1 text-xs"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? "Đang xóa..." : "Xóa"}
    </Button>
  );
}
