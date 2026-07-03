import { describe, it, expect } from "vitest";
import { isReviewDue, markReviewed, snooze7Days } from "@/lib/reminder";
import type { FormReviewState } from "@/lib/types";

const base: FormReviewState = {
  last_form_review_at: null, next_form_review_at: null,
  reminder_snooze_until: null, form_review_note: null, staff_can_see: false,
};

describe("six-month reminder", () => {
  it("due when never reviewed", () => {
    expect(isReviewDue(base)).toBe(true);
  });
  it("not due right after reviewing", () => {
    const state = { ...base, ...markReviewed(new Date("2026-01-01T00:00:00Z")) } as FormReviewState;
    expect(isReviewDue(state, new Date("2026-02-01T00:00:00Z"))).toBe(false);
  });
  it("due ~6 months after reviewing", () => {
    const state = { ...base, ...markReviewed(new Date("2026-01-01T00:00:00Z")) } as FormReviewState;
    expect(isReviewDue(state, new Date("2026-08-01T00:00:00Z"))).toBe(true);
  });
  it("snooze suppresses the reminder", () => {
    const state = { ...base, ...snooze7Days(new Date("2026-01-01T00:00:00Z")) } as FormReviewState;
    expect(isReviewDue(state, new Date("2026-01-03T00:00:00Z"))).toBe(false);
    expect(isReviewDue(state, new Date("2026-01-10T00:00:00Z"))).toBe(true);
  });
});
