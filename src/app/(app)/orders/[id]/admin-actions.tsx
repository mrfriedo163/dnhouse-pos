"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AdminOrderActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function del() {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delete_reason: deleteReason.trim() || "Quản lý đánh dấu xóa trên POS" }),
    });

    if (res.ok) {
      router.push("/orders");
      router.refresh();
      return;
    }

    const body = await res.json().catch(() => ({}));
    setDeleteError(body?.error ?? "Không thể đánh dấu xóa bill.");
    setDeleting(false);
  }

  return (
    <div className="no-print space-y-3 border-t pt-3">
      <span className="block text-xs text-slate-400">Thao tác quản trị</span>
      <div className="flex flex-wrap gap-2">
        <Link href={`/orders/${orderId}/edit`}><Button variant="secondary">Sửa bill</Button></Link>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>Đánh dấu xóa</Button>
      </div>

      {confirmDelete && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3">
          <p className="text-sm font-bold text-red-800">Đánh dấu xóa bill này?</p>
          <p className="mt-1 text-xs text-red-700">
            Bill sẽ ẩn khỏi vận hành nhưng vẫn giữ trong data để đối soát.
          </p>
          <div className="mt-3">
            <Label>Lý do xóa</Label>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Ví dụ: nhập sai thông tin khách"
            />
          </div>
          {deleteError && <p className="mt-2 text-sm font-semibold text-red-700">{deleteError}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="danger" onClick={del} disabled={deleting}>
              {deleting ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setConfirmDelete(false);
                setDeleteError(null);
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
