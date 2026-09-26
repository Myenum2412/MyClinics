import { describe, expect, it } from "vitest";
import { addDaysISO, generateSlots, hoursForDate, parseWorkingDays, weekdayOf } from "@/services/whatsapp/menu/slots";

// 2026-09-25 is a Friday, 2026-09-27 a Sunday.
describe("weekday helpers", () => {
  it("computes weekday and date arithmetic independent of timezone", () => {
    expect(weekdayOf("2026-09-25")).toBe(5);
    expect(weekdayOf("2026-09-27")).toBe(0);
    expect(addDaysISO("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("parseWorkingDays", () => {
  it("parses ranges and lists, returns null when unknown", () => {
    expect([...parseWorkingDays("Monday - Saturday")!].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...parseWorkingDays("Mon-Fri")!].sort()).toEqual([1, 2, 3, 4, 5]);
    expect([...parseWorkingDays("Mon, Wed, Fri")!].sort()).toEqual([1, 3, 5]);
    expect([...parseWorkingDays("Sat to Mon")!].sort()).toEqual([0, 1, 6]);
    expect(parseWorkingDays("by appointment")).toBeNull();
    expect(parseWorkingDays(null)).toBeNull();
  });
});

describe("hoursForDate", () => {
  const clinicHours = { open: "09:00", close: "18:00", days: "Monday - Saturday" };

  it("uses clinic hours and skips non-working days", () => {
    expect(hoursForDate({ clinicHours }, "2026-09-25")).toEqual({ start: "09:00", end: "18:00" });
    expect(hoursForDate({ clinicHours }, "2026-09-27")).toBeNull(); // Sunday
  });
  it("weekly schedule overrides clinic hours, closed days are skipped", () => {
    const weeklySchedule = [
      { day: "Friday", open: "10:00", close: "14:00", closed: false },
      { day: "Sunday", open: "00:00", close: "00:00", closed: true },
    ];
    expect(hoursForDate({ clinicHours, weeklySchedule }, "2026-09-25")).toEqual({ start: "10:00", end: "14:00" });
    expect(hoursForDate({ clinicHours, weeklySchedule }, "2026-09-27")).toBeNull();
  });
  it("doctor schedule wins; a day missing from it means not working", () => {
    const doctorSchedule = [{ day: "Fri", start: "11:00", end: "13:00" }];
    expect(hoursForDate({ clinicHours, doctorSchedule }, "2026-09-25")).toEqual({ start: "11:00", end: "13:00" });
    expect(hoursForDate({ clinicHours, doctorSchedule }, "2026-09-26")).toBeNull(); // Saturday not listed
  });
  it("empty doctor schedule falls back to the clinic", () => {
    expect(hoursForDate({ clinicHours, doctorSchedule: [] }, "2026-09-25")).toEqual({ start: "09:00", end: "18:00" });
  });
});

describe("generateSlots", () => {
  const hours = { start: "09:00", end: "11:00" };

  it("generates slots that fit fully inside the hours", () => {
    expect(generateSlots({ hours, stepMin: 30, booked: new Set() })).toEqual(["09:00", "09:30", "10:00", "10:30"]);
    expect(generateSlots({ hours: { start: "09:00", end: "10:15" }, stepMin: 30, booked: new Set() })).toEqual(["09:00", "09:30"]);
  });
  it("excludes booked slots", () => {
    expect(generateSlots({ hours, stepMin: 30, booked: new Set(["09:30", "10:30"]) })).toEqual(["09:00", "10:00"]);
  });
  it("hides past slots today, with a 15 minute buffer", () => {
    // 09:40 now → earliest bookable start is 09:55 → first slot 10:00
    expect(generateSlots({ hours, stepMin: 30, booked: new Set(), nowMin: 9 * 60 + 40 })).toEqual(["10:00", "10:30"]);
    expect(generateSlots({ hours, stepMin: 30, booked: new Set(), nowMin: 12 * 60 })).toEqual([]);
  });
  it("guards against a zero/invalid step", () => {
    expect(generateSlots({ hours, stepMin: 0, booked: new Set() }).length).toBe(4);
  });
});
