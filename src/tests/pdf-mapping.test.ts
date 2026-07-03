import { describe, it, expect } from "vitest";
import { buildBillValues } from "@/lib/pdf/fill";

describe("PDF field mapping values", () => {
  it("resolves all bill variables from order data", () => {
    const values = buildBillValues({
      order: {
        order_no: "DN-20260703-0001", received_at: "2026-07-03T03:00:00Z", due_at: null,
        customer_name: "Nguyễn Văn A", customer_phone: "0900000000",
        subtotal: 100000, discount_type: "percent", discount_value: 10, discount_total: 10000, final_total: 90000, note: "gấp",
      },
      items: [{ service_name_snapshot: "Giặt sấy thường", quantity: 2, unit_type: "kg", unit_price: 50000 }],
      shop: { shop_name: "DN HOUSE", business_type: "", address: "648/24 Bình Trung", phone: "0123" },
      createdBy: "Staff A",
    });
    expect(values.order_no).toBe("DN-20260703-0001");
    expect(values.customer_name).toBe("Nguyễn Văn A");
    expect(values.shop_address).toBe("648/24 Bình Trung");
    expect(values.final_total).toContain("90.000");
    expect(values.service_table).toContain("Giặt sấy thường");
    expect(values.created_by).toBe("Staff A");
  });
});
