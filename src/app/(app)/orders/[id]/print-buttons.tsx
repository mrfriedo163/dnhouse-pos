"use client";

import { Button } from "@/components/ui/button";

export function PrintButtons({
  billUrl: _billUrl,
  orderId,
  orderNo,
}: {
  billUrl: string | null;
  orderId: string;
  orderNo: string;
}) {
  const localPdf = `/api/orders/${orderId}/bill.pdf`;
  const fileName = `${orderNo}.pdf`;

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button onClick={() => window.open(localPdf, "_blank")}>Mở bill PDF</Button>
      <a href={localPdf} download={fileName}>
        <Button variant="secondary">Tải bill PDF</Button>
      </a>
    </div>
  );
}
