import type { FastifyInstance } from "fastify";
import { getCronDb } from "@/lib/db-pools";
import { syncCronJobs } from "@/services/cronlite/cronlite.service";
import { requireCronSecret } from "@/plugins/auth";
import { processPrescriptionNotifications } from "@/services/whatsapp/prescription-notification.service";
import {
  processAppointmentNotifications,
  sendReminderForAppointment,
} from "@/services/whatsapp/appointment-notification.service";
import { deleteFiredAppointmentJob } from "@/services/cronlite/appointment-scheduler.service";
import { deleteCronLiteJob } from "@/services/cronlite/cronlite.service";
import { nowMs } from "@/clinic/core/datetime";
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
    const [prescription, appointment] = await Promise.all([
      runStep(20_000, "processPrescriptionNotifications", () =>
        processPrescriptionNotifications(db).then(() => ({}))
      ),
      runStep(20_000, "processAppointmentNotifications", () =>
        processAppointmentNotifications(db).then(() => ({}))
      ),
    ]);

    const duration = nowMs() - startTime;
    logger.info("Cron reminders completed", {
      durationMs: duration,
      prescriptions: prescription.status,
      appointments: appointment.status,
    });
    return reply.send({
      ok: true,
      prescriptions: prescription.status,
      appointments: appointment.status,
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
  // CronLite (or legacy x-cron-secret) is configured for POST, but also handle
  // GET for health checks / manual probes.
  app.post("/api/cron/reminders", handleReminders);
  app.get("/api/cron/reminders", handleReminders);

  /**
   * Per-appointment reminder delivery. CronLite fires this one-shot job exactly
   * at (appointment − 1h) for the given appointment. After sending, the job is
   * deleted so it never re-fires. The every-minute /api/cron/reminders poll is
   * the safety-net fallback for any job that was missed or had no future window.
   */
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
      // One-shot job: remove it so it can't re-fire on a later matching date.
      // Prefer the job id from the webhook payload (authoritative even if the
      // appointment was rescheduled and the stored id now points at a new job);
      // fall back to the stored id otherwise.
      const payload = request.body as { job_id?: string } | null;
      const firedJobId = typeof payload?.job_id === "string" ? payload.job_id : "";
      if (firedJobId) {
        await deleteCronLiteJob(firedJobId).catch(() => {});
      } else {
        await deleteFiredAppointmentJob(db, clinicId, appointmentId).catch(() => {});
      }

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
      // Always 2xx so CronLite doesn't flag the execution as failed/retry.
      return reply.code(200).send({ ok: false, error: errorMessage, durationMs: duration });
    }
  });

  app.post("/api/cron/sync", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;

    try {
      const result = await withTimeout(syncCronJobs(), 15_000, "syncCronJobs");
      return reply.send({ ok: true, ...result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("cronlite sync error", { error: errorMessage });
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${errorMessage})`,
      });
    }
  });
}