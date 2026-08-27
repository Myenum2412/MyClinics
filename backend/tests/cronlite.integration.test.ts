import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";

/**
 * End-to-end-ish integration test for the CronLite integration.
 *
 * We stand up a local, in-process mock that implements the subset of the
 * CronLite HTTP API the backend uses (POST/GET /jobs, DELETE /jobs/:id, and the
 * pause/resume/trigger actions). This verifies the real client code path —
 * job creation, idempotent sync, HMAC signature verification, per-appointment
 * scheduling and cleanup — without any external credentials or network.
 */

type Job = {
  id: string;
  name: string;
  cron_expression: string;
  timezone: string;
  webhook_url: string;
  status?: string;
  [k: string]: unknown;
};

let store = new Map<string, Job>();
let seq = 0;
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const method = req.method ?? "GET";

    if (url.pathname === "/jobs" && method === "POST") {
      const data = body ? (JSON.parse(body) as Partial<Job>) : {};
      const id = `job-${++seq}`;
      const job: Job = { ...(data as Job), id, status: "enabled" };
      store.set(id, job);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(job));
      return;
    }

    if (url.pathname === "/jobs" && method === "GET") {
      const name = url.searchParams.get("name");
      const all = [...store.values()];
      const filtered = name ? all.filter((j) => j.name === name) : all;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(filtered));
      return;
    }

    const del = url.pathname.match(/^\/jobs\/([^/]+)$/);
    if (del && method === "DELETE") {
      store.delete(decodeURIComponent(del[1]));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const act = url.pathname.match(/^\/jobs\/([^/]+)\/(pause|resume|trigger)$/);
    if (act && method === "POST") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
});

let cronlite: typeof import("@/services/cronlite/cronlite.service");
let scheduler: typeof import("@/services/cronlite/appointment-scheduler.service");
let auth: typeof import("@/plugins/auth");

function makeDb() {
  const data = new Map<string, { cronliteJobId?: string | null }>();
  const collection = () => ({
    async findOne(filter: { clinicId: string; appointmentId: string }, opts?: { projection?: { cronliteJobId?: number } }) {
      const doc = data.get(`${filter.clinicId}:${filter.appointmentId}`);
      if (!doc) return null;
      if (opts?.projection?.cronliteJobId !== undefined) return { cronliteJobId: doc.cronliteJobId ?? null };
      return doc;
    },
    async updateOne(
      filter: { clinicId: string; appointmentId: string },
      update: { $set: { cronliteJobId: string | null } }
    ) {
      const key = `${filter.clinicId}:${filter.appointmentId}`;
      const doc = data.get(key) ?? {};
      doc.cronliteJobId = update.$set.cronliteJobId;
      data.set(key, doc);
      return { modifiedCount: 1 };
    },
  });
  return { collection } as any;
}

beforeAll(async () => {
  process.env.CRONLITE_API_KEY = "test-api-key";
  process.env.CRONLITE_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.APP_URL = "http://backend.test";
  process.env.CRONLITE_TIMEZONE = "Asia/Kolkata";
  process.env.CRONLITE_REMINDER_JOB_NAME = "myclinics-reminders";
  process.env.CRONLITE_REMINDER_CRON = "* * * * *";

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  process.env.CRONLITE_URL = `http://127.0.0.1:${port}`;

  // Import AFTER env is set so the module-level config reads correct values.
  cronlite = await import("@/services/cronlite/cronlite.service");
  scheduler = await import("@/services/cronlite/appointment-scheduler.service");
  auth = await import("@/plugins/auth");
});

afterAll(() => {
  server.close();
});

describe("syncCronJobs (per-minute safety-net job)", () => {
  it("creates the reminder job once, with the correct target and schedule", async () => {
    const r1 = await cronlite.syncCronJobs();
    expect(r1.action).toBe("created");
    expect(r1.jobId).toBeTruthy();

    const jobs = [...store.values()].filter((j) => j.name === "myclinics-reminders");
    expect(jobs).toHaveLength(1);
    expect(jobs[0].webhook_url).toBe("http://backend.test/api/cron/reminders");
    expect(jobs[0].cron_expression).toBe("* * * * *");
    expect(jobs[0].timezone).toBe("Asia/Kolkata");
  });

  it("is idempotent — a second sync skips and does not create a duplicate", async () => {
    const r2 = await cronlite.syncCronJobs();
    expect(r2.action).toBe("skipped");
    expect([...store.values()].filter((j) => j.name === "myclinics-reminders")).toHaveLength(1);
  });

  it("removes historical duplicate reminder jobs, keeping exactly one", async () => {
    store.set("dup-1", {
      id: "dup-1",
      name: "myclinics-reminders",
      webhook_url: "http://elsewhere",
      cron_expression: "* * * * *",
      timezone: "UTC",
    });
    store.set("dup-2", {
      id: "dup-2",
      name: "myclinics-reminders",
      webhook_url: "http://elsewhere",
      cron_expression: "* * * * *",
      timezone: "UTC",
    });

    const r = await cronlite.syncCronJobs();
    expect(r.action).toBe("skipped");
    expect([...store.values()].filter((j) => j.name === "myclinics-reminders")).toHaveLength(1);
  });
});

describe("verifyCronLiteSignature (HMAC webhook auth)", () => {
  const secret = "test-webhook-secret";

  it("accepts a correctly signed raw body", () => {
    const body = JSON.stringify({ foo: "bar", job_id: "job-1" });
    const sig = crypto.createHmac("sha256", secret).update(Buffer.from(body)).digest("hex");
    const req = { headers: { "x-cronlite-signature": sig }, rawBody: body } as any;
    expect(auth.verifyCronLiteSignature(req)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ foo: "bar" });
    const sig = crypto.createHmac("sha256", secret).update(Buffer.from(body)).digest("hex");
    const req = { headers: { "x-cronlite-signature": sig }, rawBody: body + "x" } as any;
    expect(auth.verifyCronLiteSignature(req)).toBe(false);
  });

  it("rejects a wrong signature", () => {
    const body = JSON.stringify({ foo: "bar" });
    const req = { headers: { "x-cronlite-signature": "deadbeef" }, rawBody: body } as any;
    expect(auth.verifyCronLiteSignature(req)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const body = JSON.stringify({ foo: "bar" });
    const req = { headers: {}, rawBody: body } as any;
    expect(auth.verifyCronLiteSignature(req)).toBe(false);
  });
});

describe("cronForInstant", () => {
  it("builds the correct 5-field cron for an instant in the timezone", () => {
    // 2026-09-01T04:00:00Z === 2026-09-01 09:30 IST (UTC+5:30)
    const got = scheduler.cronForInstant(new Date("2026-09-01T04:00:00Z"), "Asia/Kolkata");
    expect(got).toBe("30 09 01 09 *");
  });
});

describe("scheduleAppointmentReminder (per-appointment one-shot job)", () => {
  it("creates a one-shot job at (appointment - 1h) and is idempotent", async () => {
    const db = makeDb();
    const jobId = await scheduler.scheduleAppointmentReminder(db, "c1", "a1", "2026-09-01", "10:30", "booked");
    expect(jobId).toBeTruthy();

    const jobs = [...store.values()].filter((j) => j.name === "appt-reminder-c1-a1");
    expect(jobs).toHaveLength(1);
    expect(jobs[0].webhook_url).toBe(
      "http://backend.test/api/cron/appointment-reminder?clinicId=c1&appointmentId=a1"
    );
    // appointment 10:30 IST - 1h = 09:30 IST => cron "30 09 01 09 *"
    expect(jobs[0].cron_expression).toBe("30 09 01 09 *");

    const jobId2 = await scheduler.scheduleAppointmentReminder(db, "c1", "a1", "2026-09-01", "10:30", "booked");
    expect(jobId2).toBe(jobId);
    expect([...store.values()].filter((j) => j.name === "appt-reminder-c1-a1")).toHaveLength(1);
  });

  it("does not schedule for cancelled or past appointments", async () => {
    const db = makeDb();
    expect(await scheduler.scheduleAppointmentReminder(db, "c2", "a2", "2026-09-01", "10:30", "cancelled")).toBeNull();
    expect(await scheduler.scheduleAppointmentReminder(db, "c2", "a3", "2020-01-01", "10:30", "booked")).toBeNull();
    expect([...store.values()].filter((j) => j.name.startsWith("appt-reminder-c2"))).toHaveLength(0);
  });

  it("cancelAppointmentReminder deletes the CronLite job and clears the id", async () => {
    const db = makeDb();
    const jobId = (await scheduler.scheduleAppointmentReminder(db, "c3", "a3", "2026-09-01", "10:30", "booked"))!;
    expect(store.has(jobId)).toBe(true);
    await scheduler.cancelAppointmentReminder(db, "c3", "a3");
    expect(store.has(jobId)).toBe(false);
  });
});
