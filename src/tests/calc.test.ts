import { describe, it, expect } from "vitest";
import { computeOrderTotals, computeDiscountTotal, computeFinalTotal, computeSubtotal, lineTotal } from "@/lib/calc";

describe("calc: line + subtotal", () => {
  it("computes line totals", () => {
    expect(lineTotal(2, 50000)).toBe(100000);
    expect(lineTotal(1.5, 40000)).toBe(60000);
  });
  it("ignores negative quantity/price", () => {
    expect(lineTotal(-2, 50000)).toBe(0);
    expect(lineTotal(2, -50000)).toBe(0);
  });
  it("sums subtotal", () => {
    expect(computeSubtotal([{ quantity: 2, unit_price: 50000 }, { quantity: 1, unit_price: 30000 }])).toBe(130000);
  });
});

describe("calc: discount", () => {
  it("none => 0", () => {
    expect(computeDiscountTotal(100000, "none", 10)).toBe(0);
  });
  it("percent", () => {
    expect(computeDiscountTotal(100000, "percent", 10)).toBe(10000);
  });
  it("caps percent at 100", () => {
    expect(computeDiscountTotal(100000, "percent", 250)).toBe(100000);
  });
  it("fixed capped at subtotal", () => {
    expect(computeDiscountTotal(100000, "fixed", 30000)).toBe(30000);
    expect(computeDiscountTotal(100000, "fixed", 250000)).toBe(100000);
  });
});

describe("calc: final total never negative", () => {
  it("clamps to 0", () => {
    expect(computeFinalTotal(50000, 80000)).toBe(0);
  });
  it("full order", () => {
    const t = computeOrderTotals([{ quantity: 2, unit_price: 50000 }], "percent", 10);
    expect(t).toEqual({ subtotal: 100000, discount_total: 10000, final_total: 90000 });
  });
});
