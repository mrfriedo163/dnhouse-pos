import type { FormReviewState } from "../types";

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182; // ~6 months
const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

export function addMonthsIso(fromIso: string | null, months: number): string {
  const base = fromIso ? new Date(fromIso) : new Date();
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** Should the six-month form-review reminder be shown right now? */
export function isReviewDue(state: FormReviewState, now: Date = new Date()): boolean {
  // Snooze wins if still active.
  if (state.reminder_snooze_until && new Date(state.reminder_snooze_until) > now) {
    return false;
  }
  if (!state.next_form_review_at) {
    // Never reviewed -> treat as due so admin sets a baseline.
    return true;
  }
  return now >= new Date(state.next_form_review_at);
}

/** Mark reviewed now; next review in 6 months. */
export function markReviewed(now: Date = new Date()): Partial<FormReviewState> {
  const nowIso = now.toISOString();
  return {
    last_form_review_at: nowIso,
    next_form_review_at: new Date(now.getTime() + SIX_MONTHS_MS).toISOString(),
    reminder_snooze_until: null,
  };
}

/** Snooze the reminder for 7 days. */
export function snooze7Days(now: Date = new Date()): Partial<FormReviewState> {
  return { reminder_snooze_until: new Date(now.getTime() + SEVEN_DAYS_MS).toISOString() };
}
