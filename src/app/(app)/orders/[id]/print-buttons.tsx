"use client";

import { useState } from "react";
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
  const [sharing, setSharing] = useState(false);
  const localPdf = `/api/orders/${orderId}/bill.pdf`;
  const fileName = `${orderNo}.pdf`;

  function downloadFallback(blobUrl?: string) {
    const link = document.createElement("a");
    link.href = blobUrl ?? localPdf;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }

  async function shareToFlashLabel() {
    setSharing(true);
    try {
      const res = await fetch(localPdf);
      if (!res.ok) throw new Error("Không tải được file bill.");
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          files: [file],
          title: `Bill ${orderNo}`,
          text: "In tem DN House",
        });
      } else {
        downloadFallback(URL.createObjectURL(blob));
        alert("Máy này chưa hỗ trợ gửi thẳng sang app in. Tôi đã tải file bill xuống để mở bằng FlashLabel.");
      }
    } catch (err: any) {
      alert(err?.message ?? "Không gửi được file. Vui lòng tải bill PDF rồi mở bằng FlashLabel.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button onClick={shareToFlashLabel} disabled={sharing}>
        {sharing ? "Đang chuẩn bị..." : "Gửi sang FlashLabel"}
      </Button>
      <Button variant="secondary" onClick={() => window.open(localPdf, "_blank")}>Xem / In bill PDF</Button>
      <a href={localPdf} download={fileName}>
        <Button variant="secondary">Tải bill PDF</Button>
      </a>
    </div>
  );
}
