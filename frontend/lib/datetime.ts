/**
 * Central, timezone-safe date/time helpers for the My Clinics app.
 *
 * Every clinic in this product operates on Indian Standard Time (Asia/Kolkata,
 * UTC+05:30, no DST). All date *display* and all *local-day-boundary*
 * computations MUST go through these helpers so the app behaves identically
 * regardless of the host server / browser timezone.
 *
 * Note: IST never observes DST, so hard-coding the "+05:30" offset for
 * day-boundary instants is always correct.
 */

export const KOLKATA_TZ = "Asia/Kolkata";
export const KOLKATA_OFFSET = "+05:30";

export type DateInput = string | number | Date | null | undefined;

/** Current instant. Prefer this over `new Date()` so all "now" usage is centralized. */
export function now(): Date {
  return new Date();
}

/** Current instant as epoch milliseconds. Prefer over `Date.now()`. */
export function nowMs(): number {
  return Date.now();
}

/** Current instant as an ISO-8601 UTC string. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Safely parse any date input into a Date, or null when invalid. */
export function parseDate(value: DateInput): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "15 Jan 2024" in Asia/Kolkata. Falls back to the raw string when unparseable. */
export function formatDate(value: DateInput): string {
  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: KOLKATA_TZ,
  }).format(d);
}

/** "15 Jan 2024, 10:17 AM" in Asia/Kolkata. */
export function formatDateTime(value: DateInput): string {
  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: KOLKATA_TZ,
  }).format(d);
}

/** "10:17 AM" in Asia/Kolkata. */
export function formatTimeOnly(value: DateInput): string {
  const d = parseDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: KOLKATA_TZ,
  }).format(d);
}

/** The local "YYYY-MM-DD" date in Asia/Kolkata for a given instant. */
export function toLocalDateISO(date: DateInput = new Date()): string {
  const d = parseDate(date);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: KOLKATA_TZ,
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${day}`;
}

/** Today's date as "YYYY-MM-DD" in Asia/Kolkata. */
export function todayISO(): string {
  return toLocalDateISO(new Date());
}

/** Start of the Asia/Kolkata day (00:00:00.000 IST) as a UTC instant Date. */
export function startOfDayKolkata(date: DateInput = new Date()): Date {
  const iso = toLocalDateISO(date) || toLocalDateISO(new Date());
  return new Date(`${iso}T00:00:00${KOLKATA_OFFSET}`);
}

/** End of the Asia/Kolkata day (23:59:59.999 IST) as a UTC instant Date. */
export function endOfDayKolkata(date: DateInput = new Date()): Date {
  const iso = toLocalDateISO(date) || toLocalDateISO(new Date());
  return new Date(`${iso}T23:59:59.999${KOLKATA_OFFSET}`);
}

/** Add (or subtract) whole days to a date, returning a new Date. */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/** A Date `n` days before now (instant-based, fine for relative windows). */
export function daysAgo(n: number): Date {
  return addDays(new Date(), -n);
}

/** "January 2024" in Asia/Kolkata. */
export function formatMonthYear(value: DateInput): string {
  const d = parseDate(value);
  if (!d) return typeof value === "string" ? value : "";
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: KOLKATA_TZ,
  }).format(d);
}

/** Parse a "YYYY-MM-DD" calendar date as a Kolkata-local midnight instant. */
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00${KOLKATA_OFFSET}`);
}

/**
 * Weekday index (0=Sun … 6=Sat) for a "YYYY-MM-DD" calendar date.
 * The weekday of a calendar date is identical in every timezone, so a plain
 * local-midnight parse yields the correct result without any offset math.
 */
export function weekdayIndex(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay();
}
