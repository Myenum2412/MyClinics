import { parseLocalDate, todayISO, toLocalDateISO } from "@/clinic/core/datetime";

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

export function dateString(d: Date) {
  return toLocalDateISO(d);
}

export function todayDateString() {
  return todayISO();
}

function kolkataTodayParts(): [number, number, number] {
  const [y, m, d] = todayISO().split("-").map(Number);
  return [y, m, d];
}

function formatParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function mondayDateString() {
  const [y, m, d] = kolkataTodayParts();
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const dt = new Date(Date.UTC(y, m - 1, d - mondayOffset));
  return formatParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function startOfMonthDate() {
  const [y, m] = kolkataTodayParts();
  return parseLocalDate(formatParts(y, m, 1));
}

export function startOfWeekDate() {
  return parseLocalDate(mondayDateString());
}
