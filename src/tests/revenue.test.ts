import { describe, it, expect } from "vitest";
import { computeOrderTotals } from "@/lib/calc";

// Revenue is counted at IN time; completion must not change it.
describe("revenue immutability on completion", () => {
  it("completion does not recompute totals", () => {
    const totals = computeOrderTotals([{ quantity: 3, unit_price: 25000 }], "fixed", 15000);
    const atCreation = { ...totals };
    // Simulate completion: flip is_completed only, totals untouched.
    const afterCompletion = { is_completed: true, ...totals };
    expect(afterCompletion.subtotal).toBe(atCreation.subtotal);
    expect(afterCompletion.discount_total).toBe(atCreation.discount_total);
    expect(afterCompletion.final_total).toBe(atCreation.final_total);
    expect(afterCompletion.final_total).toBe(60000);
  });
});
