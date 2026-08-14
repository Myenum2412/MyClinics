import { describe, it, expect } from "vitest";
import { createFakeDb } from "./helpers/fake-db";
import {
  reassignCounters,
  getTodayQueue,
  getNextQueuedAppointment,
} from "@/services/queue.service";
import { toWhatsAppRemoteId } from "@/lib/phone";
import { todayDateString } from "@/lib/stats";

function seed(docs: Record<string, unknown>[]) {
  return createFakeDb({
    appointments: docs.map((d) => ({
      fullName: "Patient",
      mobile: "919876543210",
      whatsapp: "919876543210",
      doctorId: "doc-1",
      doctorName: "Dr. Test",
      date: "2026-08-12",
      time: "10:00",
      type: "in-person",
      status: "pending",
      bookingSource: "manual",
      createdAt: new Date(),
      ...d,
    })),
  });
}

describe("reassignCounters", () => {
  it("numbers active appointments 1..n in time order", async () => {
    const { db } = seed([
      { time: "10:00" },
      { time: "09:30" },
      { time: "09:00" },
    ]);

    await reassignCounters(db, "2026-08-12");

    const appts = await db.collection("appointments").find({}).toArray();
    const byTime = (t: string) => appts.find((a) => a.time === t)!;
    expect(byTime("09:00").counter).toBe(1);
    expect(byTime("09:30").counter).toBe(2);
    expect(byTime("10:00").counter).toBe(3);
  });

  it("excludes completed/cancelled appointments and clears stale counters", async () => {
    const { db } = seed([
      { time: "09:00", status: "completed", counter: 1 },
      { time: "09:30", counter: 2 },
    ]);

    await reassignCounters(db, "2026-08-12");

    const appts = await db.collection("appointments").find({}).toArray();
    const byTime = (t: string) => appts.find((a) => a.time === t)!;
    expect(byTime("09:00").counter).toBeUndefined();
    expect(byTime("09:30").counter).toBe(1);
  });
});

describe("getTodayQueue", () => {
  it("returns only today's pending/confirmed appointments in time order", async () => {
    const today = todayDateString();
    const { db, dump } = seed([
      { time: "10:00", date: today },
      { time: "09:00", date: today },
      { time: "09:00", date: "2026-01-01" },
      { time: "11:00", date: today, status: "completed" },
    ]);

    const queue = await getTodayQueue(db);
    expect(queue).toHaveLength(2);
    expect(queue[0].time).toBe("09:00");
    expect(queue[1].time).toBe("10:00");
    expect(dump("appointments").length).toBe(4);
  });
});

describe("getNextQueuedAppointment", () => {
  it("returns the earliest waiting appointment", async () => {
    const { db } = seed([
      { time: "10:00" },
      { time: "09:00" },
      { time: "11:00", status: "completed" },
    ]);

    const next = await getNextQueuedAppointment(db, "2026-08-12");
    expect(next?.time).toBe("09:00");
    expect(next?.counter).toBe(1);
  });

  it("returns null when the queue is empty", async () => {
    const { db } = seed([{ time: "11:00", status: "completed" }]);
    const next = await getNextQueuedAppointment(db, "2026-08-12");
    expect(next).toBeNull();
  });
});

describe("toWhatsAppRemoteId", () => {
  it("normalizes 10-digit numbers with the 91 country code", () => {
    expect(toWhatsAppRemoteId("9876543210")).toBe("919876543210@c.us");
  });

  it("keeps already-normalized remote ids", () => {
    expect(toWhatsAppRemoteId("919876543210@c.us")).toBe("919876543210@c.us");
  });

  it("rejects numbers that cannot be resolved", () => {
    expect(toWhatsAppRemoteId("123")).toBeNull();
    expect(toWhatsAppRemoteId(null)).toBeNull();
  });
});
