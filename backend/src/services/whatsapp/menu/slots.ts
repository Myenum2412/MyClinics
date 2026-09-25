/** Pure scheduling helpers: which days a clinic/doctor works and which slots are free. */

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface DayHours {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface HoursSource {
  /** Doctor's own weekly schedule (day = Mon..Sun). Empty/undefined → fall back to clinic hours. */
  doctorSchedule?: { day: string; start: string; end: string }[] | null;
  clinicHours: { open: string; close: string; days?: string | null };
  weeklySchedule?: { day: string; open: string; close: string; closed: boolean }[] | null;
}

export const toMinutes = (hm: string): number => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

export const toHm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** 0=Sun … 6=Sat for a calendar date (timezone-independent). */
export const weekdayOf = (dateISO: string): number => new Date(`${dateISO}T00:00:00Z`).getUTCDay();

export function addDaysISO(dateISO: string, n: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const dayIndex = (name: string): number => DAY_KEYS.indexOf(name.trim().slice(0, 3).toLowerCase() as (typeof DAY_KEYS)[number]);

/** Parses "Monday - Saturday", "Mon-Sat" or "Mon, Tue, Thu" into working weekday indexes; null = unknown/all days. */
export function parseWorkingDays(days: string | null | undefined): Set<number> | null {
  if (!days) return null;
  const range = days.match(/([a-z]{3,9})\s*(?:-|–|to)\s*([a-z]{3,9})/i);
  if (range) {
    const from = dayIndex(range[1]);
    const to = dayIndex(range[2]);
    if (from >= 0 && to >= 0) {
      const set = new Set<number>();
      for (let i = from; ; i = (i + 1) % 7) {
        set.add(i);
        if (i === to) break;
      }
      return set;
    }
  }
  const named = days
    .split(/[,&/]|\band\b/i)
    .map(dayIndex)
    .filter((i) => i >= 0);
  return named.length ? new Set(named) : null;
}

/** The hours worked on a date, or null when the doctor/clinic does not work that day. */
export function hoursForDate(src: HoursSource, dateISO: string): DayHours | null {
  const wd = weekdayOf(dateISO);

  if (src.doctorSchedule && src.doctorSchedule.length > 0) {
    const entry = src.doctorSchedule.find((s) => dayIndex(s.day) === wd);
    return entry ? { start: entry.start, end: entry.end } : null;
  }
  if (src.weeklySchedule && src.weeklySchedule.length > 0) {
    const entry = src.weeklySchedule.find((s) => dayIndex(s.day) === wd);
    if (entry) return entry.closed ? null : { start: entry.open, end: entry.close };
  }
  const working = parseWorkingDays(src.clinicHours.days);
  if (working && !working.has(wd)) return null;
  return { start: src.clinicHours.open, end: src.clinicHours.close };
}

export function generateSlots(opts: {
  hours: DayHours;
  stepMin: number;
  booked: Set<string>;
  /** When the date is today: current minutes since midnight, so past slots are hidden. */
  nowMin?: number;
  bufferMin?: number;
}): string[] {
  const step = opts.stepMin > 0 ? opts.stepMin : 30;
  const end = toMinutes(opts.hours.end);
  const cutoff = opts.nowMin === undefined ? -1 : opts.nowMin + (opts.bufferMin ?? 15);
  const out: string[] = [];
  for (let t = toMinutes(opts.hours.start); t + step <= end; t += step) {
    const hm = toHm(t);
    if (t < cutoff || opts.booked.has(hm)) continue;
    out.push(hm);
  }
  return out;
}
