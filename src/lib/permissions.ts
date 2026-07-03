import type { Role } from "./types";

/** Pages/actions gated to admin only. Staff gets the operational subset. */
export const ADMIN_ONLY = new Set<string>([
  "services", "templates", "reports", "declarations", "drive", "settings",
  "order.edit", "order.delete", "order.uncomplete", "backup",
]);

export const STAFF_ALLOWED = new Set<string>([
  "dashboard", "orders", "orders.new", "orders.out", "order.create", "order.complete", "bill.print",
]);

export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "admin";
}

/** Can a role access a given page/action key? Admin can do everything. */
export function canAccess(role: Role | null | undefined, key: string): boolean {
  if (role === "admin") return true;
  if (role === "staff") return STAFF_ALLOWED.has(key) && !ADMIN_ONLY.has(key);
  return false;
}
