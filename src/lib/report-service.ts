import { createAdminClient } from "./supabase/admin";
import type { Order } from "./types";
import type { ServiceSummaryRow } from "./excel/report";

const TZ = "Asia/Ho_Chi_Minh";

/** Local-day boundaries (in UTC ISO) for a YYYY-MM-DD date in the shop tz. */
export function dayRange(dateStr: string): { start: string; end: string } {
  // dateStr is a local calendar date; +07:00 offset for Asia/Ho_Chi_Minh.
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(`${dateStr}T23:59:59.999+07:00`);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function monthRange(monthStr: string): { start: string; end: string } {
  const [y, m] = monthStr.split("-").map(Number);
  const start = new Date(`${monthStr}-01T00:00:00+07:00`);
  const end = new Date(new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+07:00`).setMonth(start.getMonth() + 1) - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function fetchOrders(startIso: string, endIso: string): Promise<Order[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .is("deleted_at", null)
    .gte("received_at", startIso)
    .lte("received_at", endIso)
    .order("received_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Order[];
}

async function serviceSummary(orderIds: string[]): Promise<ServiceSummaryRow[]> {
  if (orderIds.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("order_items")
    .select("service_name_snapshot, quantity, line_total")
    .in("order_id", orderIds);
  const map = new Map<string, ServiceSummaryRow>();
  for (const it of data ?? []) {
    const key = it.service_name_snapshot as string;
    const row = map.get(key) ?? { service_name: key, quantity: 0, revenue: 0 };
    row.quantity += Number(it.quantity);
    row.revenue += Number(it.line_total);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

function totalsOf(orders: Order[]) {
  const gross = orders.reduce((s, o) => s + Number(o.subtotal), 0);
  const discount = orders.reduce((s, o) => s + Number(o.discount_total), 0);
  const net = orders.reduce((s, o) => s + Number(o.final_total), 0);
  const completedCount = orders.filter((o) => o.is_completed).length;
  return {
    gross, discount, net,
    inCount: orders.length,
    completedCount,
    pendingCount: orders.length - completedCount,
  };
}

export async function buildDailyData(dateStr: string, shopName: string) {
  const { start, end } = dayRange(dateStr);
  const orders = await fetchOrders(start, end);
  const summary = await serviceSummary(orders.map((o) => o.id));
  const incomplete = orders.filter((o) => !o.is_completed);
  return { date: dateStr, shopName, orders, serviceSummary: summary, incomplete, totals: totalsOf(orders) };
}

export async function buildMonthlyData(monthStr: string, shopName: string) {
  const { start, end } = monthRange(monthStr);
  const orders = await fetchOrders(start, end);
  const summary = await serviceSummary(orders.map((o) => o.id));
  const incomplete = orders.filter((o) => !o.is_completed);

  const byDay = new Map<string, { date: string; gross: number; discount: number; net: number; count: number }>();
  for (const o of orders) {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(o.received_at));
    const row = byDay.get(d) ?? { date: d, gross: 0, discount: 0, net: 0, count: 0 };
    row.gross += Number(o.subtotal); row.discount += Number(o.discount_total);
    row.net += Number(o.final_total); row.count += 1;
    byDay.set(d, row);
  }
  return {
    month: monthStr, shopName, orders, serviceSummary: summary, incomplete,
    dailyRevenue: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
