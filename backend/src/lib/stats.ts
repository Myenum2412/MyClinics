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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayDateString() {
  return dateString(new Date());
}

export function mondayDateString() {
  const d = new Date();
  const monday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - monday);
  return dateString(d);
}

export function startOfMonthDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfWeekDate() {
  const d = new Date();
  const monday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - monday);
  d.setHours(0, 0, 0, 0);
  return d;
}
