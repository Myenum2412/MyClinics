export type StatsItem = {
  name: string;
  current: number;
  allowed: number;
  fill: string;
};

export function capacityOf(current: number, allowed: number) {
  if (!Number.isFinite(allowed) || allowed <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / allowed) * 100)));
}

export const CLINIC_TIMEZONE = "Asia/Kolkata";

function zonedParts(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
}

export function dateString(d: Date, tz = CLINIC_TIMEZONE) {
  const parts = zonedParts(d, tz);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayDateString() {
  return dateString(new Date());
}

export function mondayDateString() {
  const [y, m, day] = todayDateString().split("-").map(Number);
  const d = new Date(y, m - 1, day);
  const monday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - monday);
  return dateString(d);
}

export function startOfMonthDate() {
  const [y, m] = todayDateString().split("-").map(Number);
  return new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+05:30`);
}

export function startOfWeekDate() {
  return new Date(`${mondayDateString()}T00:00:00+05:30`);
}
