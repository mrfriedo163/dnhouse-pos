import { describe, it, expect } from "vitest";
import { dayRange, monthRange } from "@/lib/report-service";

// Revenue windows are computed in the shop timezone (Asia/Ho_Chi_Minh, UTC+7).
describe("daily/monthly revenue windows (received_at based)", () => {
  it("day range covers the full local day in UTC", () => {
    const { start, end } = dayRange("2026-07-03");
    // 2026-07-03 00:00 +07:00 == 2026-07-02T17:00:00Z
    expect(start).toBe("2026-07-02T17:00:00.000Z");
    expect(end.startsWith("2026-07-03T16:59:59")).toBe(true);
  });
  it("month range starts at first local day", () => {
    const { start } = monthRange("2026-07");
    expect(start).toBe("2026-06-30T17:00:00.000Z");
  });
  it("declaration export range = same day boundaries reused", () => {
    // from=2026-07-01 to=2026-07-31 -> start of Jul 1 .. end of Jul 31
    const from = dayRange("2026-07-01").start;
    const to = dayRange("2026-07-31").end;
    expect(from).toBe("2026-06-30T17:00:00.000Z");
    expect(to.startsWith("2026-07-31T16:59:59")).toBe(true);
  });
});
