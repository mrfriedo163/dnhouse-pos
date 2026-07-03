import { describe, it, expect } from "vitest";
import { canAccess, isAdminRole } from "@/lib/permissions";

describe("role permissions", () => {
  it("admin can do everything", () => {
    for (const k of ["settings", "drive", "reports", "order.delete", "order.create", "orders.new"]) {
      expect(canAccess("admin", k)).toBe(true);
    }
  });
  it("staff can run IN/OUT operations", () => {
    expect(canAccess("staff", "orders.new")).toBe(true);
    expect(canAccess("staff", "order.create")).toBe(true);
    expect(canAccess("staff", "order.complete")).toBe(true);
    expect(canAccess("staff", "orders")).toBe(true);
  });
  it("staff cannot reach admin-only surfaces", () => {
    for (const k of ["settings", "drive", "declarations", "templates", "order.delete", "order.uncomplete", "backup"]) {
      expect(canAccess("staff", k)).toBe(false);
    }
  });
  it("null role has no access", () => {
    expect(canAccess(null, "dashboard")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});
