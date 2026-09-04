import { formatDate as formatDateKolkata } from "@/lib/datetime";

export { formatDateKolkata as formatDate };

/**
 * Formats a "HH:MM" 24-hour time as 12-hour with AM/PM (e.g. "22:17" → "10:17 PM").
 * This is a time-of-day string, not an instant, so it needs no timezone handling.
 */
export function formatTime(
  time: string | null | undefined
): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
