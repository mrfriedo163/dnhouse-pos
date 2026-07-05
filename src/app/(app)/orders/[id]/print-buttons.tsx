"use client";

import { Button } from "@/components/ui/button";

export function PrintButtons({ orderId }: { billUrl: string | null; orderId: string }) {
  const localPdf = `/api/orders/${orderId}/bill.pdf`;
  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button onClick={() => window.open(localPdf, "_blank")}>Xem / In bill PDF</Button>
      <a href={localPdf} download>
        <Button variant="secondary">Tải bill PDF</Button>
      </a>
    </div>
  );
}
