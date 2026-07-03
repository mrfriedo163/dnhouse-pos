"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AdminOrderActions({ orderId, isCompleted }: { orderId: string; isCompleted: boolean }) {
  const router = useRouter();

  async function undo() {
    if (!confirm("Hoàn tác hoàn thành đơn này?")) return;
    const res = await fetch(`/api/orders/${orderId}/complete`, { method: "DELETE" });
    if (res.ok) router.refresh(); else alert("Không thể hoàn tác");
  }
  async function del() {
    if (!confirm("Xoá đơn này? Hành động được ghi audit log và không thể hoàn tác.")) return;
    const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    if (res.ok) { router.push("/orders"); router.refresh(); } else alert("Không thể xoá");
  }

  return (
    <div className="no-print flex flex-wrap gap-2 border-t pt-3">
      <span className="w-full text-xs text-slate-400">Thao tác quản trị</span>
      <Link href={`/orders/${orderId}/edit`}><Button variant="secondary">Sửa đơn</Button></Link>
      {isCompleted && <Button variant="secondary" onClick={undo}>Hoàn tác hoàn thành</Button>}
      <Button variant="danger" onClick={del}>Xoá đơn</Button>
    </div>
  );
}
