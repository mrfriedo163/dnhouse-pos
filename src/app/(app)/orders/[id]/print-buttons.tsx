"use client";
import { Button } from "@/components/ui/button";

export function PrintButtons({ billUrl, orderId }: { billUrl: string | null; orderId: string }) {
  const localPdf = `/api/orders/${orderId}/bill.pdf`;
  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button onClick={() => window.open(localPdf, "_blank")}>Xem / In bill (PDF)</Button>
      <a href={localPdf} download><Button variant="secondary">Tải bill PDF</Button></a>
      {billUrl && <a href={billUrl} target="_blank" rel="noreferrer"><Button variant="ghost">Mở bill trên Drive</Button></a>}
    </div>
  );
}
