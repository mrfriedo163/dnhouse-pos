import { describe, it, expect } from "vitest";
import { buildOrderNo, nextDailySeq, datePart } from "@/lib/order-number";

describe("order number", () => {
  it("formats DN-YYYYMMDD-NNNN", () => {
    const d = new Date("2026-07-03T10:00:00+07:00");
    expect(buildOrderNo("DN", d, 1)).toBe(`DN-${datePart(d)}-0001`);
    expect(buildOrderNo("DN", d, 42)).toBe(`DN-${datePart(d)}-0042`);
  });
  it("uses the shop timezone for the date part", () => {
    // 23:30 UTC on 2026-07-02 is 06:30 on 2026-07-03 in Asia/Ho_Chi_Minh
    const d = new Date("2026-07-02T23:30:00Z");
    expect(datePart(d)).toBe("20260703");
  });
  it("increments daily sequence", () => {
    expect(nextDailySeq(0)).toBe(1);
    expect(nextDailySeq(7)).toBe(8);
  });
});
