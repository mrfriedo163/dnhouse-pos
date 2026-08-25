import { describe, expect, it } from "vitest";
import { formatShopDate, formatShopDateTime } from "../lib/datetime";

describe("shop date formatting", () => {
  it("always displays Supabase UTC timestamps in Vietnam time", () => {
    expect(formatShopDateTime("2026-08-25T12:00:00.000Z")).toBe("19:00:00 25/08/2026");
  });

  it("uses the Vietnam calendar date around UTC midnight", () => {
    expect(formatShopDate("2026-08-25T18:30:00.000Z")).toBe("26/08/2026");
  });
});
