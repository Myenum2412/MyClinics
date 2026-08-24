import type { FastifyInstance } from "fastify";
import { getCronDb } from "@/lib/db-pools";
import { syncCronJobs } from "@/services/cronjob/cronjob.service";
import { requireCronSecret } from "@/plugins/auth";
import { processPrescriptionNotifications } from "@/services/whatsapp/prescription-notification.service";
import { processAppointmentNotifications } from "@/services/whatsapp/appointment-notification.service";
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
 * Entry point for the appointment reminder scheduler (cron-job.org pings this
 * every minute). Drains the tenant notification queues (prescriptions and
 * appointment events/1-hour reminders) that the WhatsApp worker then delivers.
 *
 * Design notes:
 *  - All streams run CONCURRENTLY with individual budgets. The previous
 *    sequential chain could spend up to ~25s of wall-clock (plus a 10s DB
 *    connect), which periodically exceeded the reverse-proxy timeout and
 *    surfaced as 502 Bad Gateway to the scheduler.
 *  - The endpoint ALWAYS answers with a 2xx so cron-job.org never flags the
 *    job as failed. This is a best-effort, idempotent queueing job that
 *    re-runs every minute; real problems are visible in the logs.
 */
async function handleReminders(request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) {
  if (!requireCronSecret(request, reply)) return;

  const startTime = Date.now();
  try {
    // Keep total budget < 9s to stay under typical 10s reverse-proxy timeout (e.g. Cloudflare/Nginx on api.myclinic.myenum.in)
    const db = await withTimeout(getCronDb(), 5_000, "getCronDb");

    const [prescription, appointment] = await Promise.all([
      runStep(5_000, "processPrescriptionNotifications", () =>
        processPrescriptionNotifications(db).then(() => ({}))
      ),
      runStep(5_000, "processAppointmentNotifications", () =>
        processAppointmentNotifications(db).then(() => ({}))
      ),
    ]);

    const duration = Date.now() - startTime;
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
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Cron reminders error", { durationMs: duration, error: errorMessage });
    return reply.code(200).send({ ok: false, error: errorMessage, durationMs: duration });
  }
}

export function registerCronRoutes(app: FastifyInstance): void {
  // cron-job.org is configured for POST, but also handle GET for health checks / manual probes
  app.post("/api/cron/reminders", handleReminders);
  app.get("/api/cron/reminders", handleReminders);

  app.post("/api/cron/sync", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;

    try {
      const result = await withTimeout(syncCronJobs(), 15_000, "syncCronJobs");
      return reply.send({ ok: true, ...result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Cron-job.org sync error", { error: errorMessage });
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${errorMessage})`,
      });
    }
  });
}