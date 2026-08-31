import type { FastifyInstance } from "fastify";
import { getCronDb } from "@/lib/db-pools";
import { requireCronSecret } from "@/plugins/auth";
import { processPrescriptionNotifications } from "@/services/whatsapp/prescription-notification.service";
import {
  processAppointmentNotifications,
  sendReminderForAppointment,
} from "@/services/whatsapp/appointment-notification.service";
import {
  isMorningDigestHour,
  processMorningDigests,
} from "@/services/whatsapp/morning-digest.service";
import { now, nowMs } from "@/clinic/core/datetime";
import { logger } from "@/lib/logger";

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  // Prevent an unhandled rejection when the work settles after the timeout
  // already fired — the race is decided, but the loser still needs a handler.
  promise.catch(() => {});
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

interface StepResult<T = Record<string, unknown>> {
  status: "ok" | "error" | "timeout";
  error?: string;
  data?: T;
}

/**
 * Runs a single cron work-stream with a budget. Failures are logged and
 * returned (not thrown) so one slow/broken stream never fails the batch.
 */
async function runStep<T>(ms: number, label: string, fn: () => Promise<T>): Promise<StepResult<T>> {
  try {
    const data = await withTimeout(fn(), ms, label);
    return { status: "ok", data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = error instanceof Error && /timed out/.test(error.message);
    logger.warn(`Cron step ${label} ${timedOut ? "timed out" : "failed"}`, { error: message });
    return { status: timedOut ? "timeout" : "error", error: message };
  }
}

/**
 * Entry point for the appointment reminder scheduler (CronLite pings this
 * every minute). Drains the tenant notification queues (prescriptions and
 * appointment events/1-hour reminders) that the WhatsApp worker then delivers.
 *
 * Design notes:
 *  - All streams run CONCURRENTLY with individual budgets. The previous
 *    sequential chain could spend up to ~25s of wall-clock (plus a 10s DB
 *    connect), which periodically exceeded the reverse-proxy timeout and
 *    surfaced as 502 Bad Gateway to the scheduler.
 *  - The endpoint ALWAYS answers with a 2xx so CronLite never flags the
 *    job as failed. This is a best-effort, idempotent queueing job that
 *    re-runs every minute; real problems are visible in the logs.
 */
async function handleReminders(request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) {
  if (!requireCronSecret(request, reply)) return;

  const startTime = nowMs();
  try {
    // Allow up to 8 s for the DB pool on a cold start (first connect + server
    // selection can legitimately take ~5-6 s on a fresh MongoDB Atlas cold pick).
    // Previously 5 s was too tight and caused spurious timeouts on the first
    // cron tick after a server restart.
    const db = await withTimeout(getCronDb(), 8_000, "getCronDb");

    // Run both notification streams concurrently. Each gets 20 s which keeps
    // the absolute worst-case wall-clock well under Cloudflare's 30 s proxy
    // timeout. The previous 5 s budget was so tight that any momentary Atlas
    // latency spike (common during the shared-tier scaling window) caused a
    // step timeout that surfaced as an incomplete response → 502.
    const nowDate = now();

    // Morning digest: only attempt during the 10 AM IST window.
    // Idempotent per (clinicId, date) so repeated ticks in the same hour are safe.
    const morningDigestStep: Promise<StepResult> = isMorningDigestHour(nowDate)
      ? runStep(20_000, "processMorningDigests", () =>
          processMorningDigests(db, nowDate).then((r) => r as unknown as Record<string, unknown>)
        )
      : Promise.resolve({ status: "ok" as const, data: { skipped: "outside 10am window" } });

    const [prescription, appointment, morningDigest] = await Promise.all([
      runStep(20_000, "processPrescriptionNotifications", () =>
        processPrescriptionNotifications(db).then(() => ({}))
      ),
      runStep(20_000, "processAppointmentNotifications", () =>
        processAppointmentNotifications(db).then(() => ({}))
      ),
      morningDigestStep,
    ]);

    const duration = nowMs() - startTime;
    logger.info("Cron reminders completed", {
      durationMs: duration,
      prescriptions: prescription.status,
      appointments: appointment.status,
      morningDigest: morningDigest.status,
    });
    return reply.send({
      ok: true,
      prescriptions: prescription.status,
      appointments: appointment.status,
      morningDigest: morningDigest.status,
      durationMs: duration,
    });
  } catch (error) {
    const duration = nowMs() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Cron reminders error", { durationMs: duration, error: errorMessage });
    return reply.code(200).send({ ok: false, error: errorMessage, durationMs: duration });
  }
}

export function registerCronRoutes(app: FastifyInstance): void {
  // External schedulers (e.g. cron-job.org) ping this every minute. Also handle
  // GET for health checks / manual probes.
  app.post("/api/cron/reminders", handleReminders);
  app.get("/api/cron/reminders", handleReminders);

  /**
   * Daily 10 AM IST morning digest — sends today's appointment summary to
   * each doctor and to the clinic's WhatsApp number via the tenant queue.
   * Idempotent per (clinicId, date). Safe to call repeatedly; only the first
   * call per clinic per day enqueues messages.
   *
   * Schedule this with an external cron at 10:00 AM Asia/Kolkata daily:
   *   POST /api/cron/morning-digest  (header x-cron-secret: <CRON_SECRET>)
   * Use ?force=1 to re-run outside the 10 AM window (e.g. manual backfill).
   */
  async function handleMorningDigest(
    request: import("fastify").FastifyRequest,
    reply: import("fastify").FastifyReply
  ) {
    if (!requireCronSecret(request, reply)) return;
    const query = request.query as Record<string, unknown>;
    const force = query.force === "1" || query.force === "true";
    const nowDate = now();
    if (!force && !isMorningDigestHour(nowDate)) {
      return reply.send({
        ok: true,
        skipped: true,
        reason: "outside 10am IST window — use ?force=1 to override",
        hourKolkata: new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          hour12: false,
        }).format(nowDate),
      });
    }
    const startTime = nowMs();
    try {
      const db = await withTimeout(getCronDb(), 8_000, "getCronDb");
      const result = await withTimeout(processMorningDigests(db, nowDate), 25_000, "processMorningDigests");
      const duration = nowMs() - startTime;
      logger.info("Morning digest completed", { ...result, durationMs: duration });
      return reply.send({ ok: true, ...result, durationMs: duration });
    } catch (error) {
      const duration = nowMs() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Morning digest error", { durationMs: duration, error: errorMessage });
      return reply.code(200).send({ ok: false, error: errorMessage, durationMs: duration });
    }
  }

  app.post("/api/cron/morning-digest", handleMorningDigest);
  app.get("/api/cron/morning-digest", handleMorningDigest);

  app.post("/api/cron/appointment-reminder", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;

    const query = request.query as Record<string, unknown>;
    const clinicId = typeof query.clinicId === "string" ? query.clinicId : "";
    const appointmentId = typeof query.appointmentId === "string" ? query.appointmentId : "";
    if (!clinicId || !appointmentId) {
      return reply.code(400).send({ error: "clinicId and appointmentId are required" });
    }

    const startTime = nowMs();
    try {
      const db = await withTimeout(getCronDb(), 8_000, "getCronDb");
      const sent = await withTimeout(
        sendReminderForAppointment(db, clinicId, appointmentId),
        20_000,
        "sendReminderForAppointment"
      );

      const duration = nowMs() - startTime;
      logger.info("Per-appointment reminder delivered", {
        clinicId,
        appointmentId,
        sent,
        durationMs: duration,
      });
      return reply.send({ ok: true, sent, durationMs: duration });
    } catch (error) {
      const duration = nowMs() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Per-appointment reminder failed", {
        clinicId,
        appointmentId,
        durationMs: duration,
        error: errorMessage,
      });
      // Always 2xx so the external scheduler doesn't flag the execution as failed.
      return reply.code(200).send({ ok: false, error: errorMessage, durationMs: duration });
    }
  });
}