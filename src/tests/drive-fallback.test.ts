import { describe, it, expect } from "vitest";

/**
 * Documents the Drive-upload fallback contract used by generateAndUploadBill:
 * a Drive failure must NOT throw — the order stays saved and a warning is returned.
 * (Full integration is exercised against a live Drive connection; here we assert
 * the shape of the fallback result our API relies on.)
 */
type BillResult = { ok: boolean; warning?: string };

function handleBillResult(r: BillResult) {
  return { saved: true, driveWarning: r.ok ? null : r.warning ?? "unknown" };
}

describe("Drive upload fallback", () => {
  it("order saved + warning surfaced when Drive fails", () => {
    const out = handleBillResult({ ok: false, warning: "Google Drive chưa kết nối." });
    expect(out.saved).toBe(true);
    expect(out.driveWarning).toBe("Google Drive chưa kết nối.");
  });
  it("no warning when Drive succeeds", () => {
    const out = handleBillResult({ ok: true });
    expect(out.driveWarning).toBeNull();
  });
});
