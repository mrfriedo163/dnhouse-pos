"use client";

import { Button } from "@/components/ui/button";

export function PrintButtons({
  orderId,
  orderNo,
}: {
  orderId: string;
  orderNo: string;
}) {
  const localPdf = `/api/orders/${orderId}/bill.pdf`;
  const fileName = `${orderNo}.pdf`;

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => window.open(localPdf, "_blank")}>Mở bill PDF</Button>
        <a href={localPdf} download={fileName}>
          <Button variant="secondary">Tải bill PDF</Button>
        </a>
      </div>
      <p className="text-xs text-slate-500">
        Bill PDF chỉ tạo khi xem/in/tải, không lưu lên Google Drive để tránh đầy bộ nhớ.
      </p>
    </div>
  );
}
