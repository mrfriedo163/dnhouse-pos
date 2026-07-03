/**
 * Order number format: <PREFIX>-YYYYMMDD-NNNN
 * The sequence NNNN resets each day, based on how many orders already exist
 * for that received_at date.
 */

export function datePart(d: Date, timeZone = "Asia/Ho_Chi_Minh"): string {
  // Produce YYYYMMDD in the shop's timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${y}${m}${day}`;
}

export function buildOrderNo(prefix: string, date: Date, dailySeq: number): string {
  const seq = String(Math.max(1, dailySeq)).padStart(4, "0");
  return `${prefix}-${datePart(date)}-${seq}`;
}

/** Given the count of orders already created today, return the next sequence. */
export function nextDailySeq(existingCountToday: number): number {
  return existingCountToday + 1;
}
