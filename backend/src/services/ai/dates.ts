import { KOLKATA_TZ, todayISO } from "@/clinic/core/datetime";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export { todayISO };

export function isISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

export function isPastDate(value: string): boolean {
  return value < todayISO();
}

export function isValidTime(value: string): boolean {
  return TIME_24H.test(value);
}

export function minutesOf(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function timeInRange(value: string, open: string, close: string): boolean {
  const t = minutesOf(value);
  return t >= minutesOf(open) && t < minutesOf(close);
}

export function formatISODate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: KOLKATA_TZ,
  }).format(parsed);
}

export function formatTime12h(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}
