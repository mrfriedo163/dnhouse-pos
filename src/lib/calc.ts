import type { DiscountType, OrderItemInput } from "./types";

export function round(n: number): number {
  // VND: round to whole number.
  return Math.round((n + Number.EPSILON));
}

export function lineTotal(quantity: number, unitPrice: number): number {
  const q = Number.isFinite(quantity) ? quantity : 0;
  const p = Number.isFinite(unitPrice) ? unitPrice : 0;
  return round(Math.max(0, q) * Math.max(0, p));
}

export function computeSubtotal(items: Pick<OrderItemInput, "quantity" | "unit_price">[]): number {
  return round(items.reduce((sum, it) => sum + lineTotal(it.quantity, it.unit_price), 0));
}

export function computeDiscountTotal(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  const v = Math.max(0, Number.isFinite(discountValue) ? discountValue : 0);
  if (discountType === "percent") {
    const pct = Math.min(100, v);
    return round(subtotal * pct / 100);
  }
  if (discountType === "fixed") {
    return round(Math.min(subtotal, v));
  }
  return 0;
}

export function computeFinalTotal(
  subtotal: number,
  discountTotal: number,
): number {
  return Math.max(0, round(subtotal - discountTotal));
}

export interface OrderTotals {
  subtotal: number;
  discount_total: number;
  final_total: number;
}

export function computeOrderTotals(
  items: Pick<OrderItemInput, "quantity" | "unit_price">[],
  discountType: DiscountType,
  discountValue: number,
): OrderTotals {
  const subtotal = computeSubtotal(items);
  const discount_total = computeDiscountTotal(subtotal, discountType, discountValue);
  const final_total = computeFinalTotal(subtotal, discount_total);
  return { subtotal, discount_total, final_total };
}

export function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(round(n)) + " đ";
}
