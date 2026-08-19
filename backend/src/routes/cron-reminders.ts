import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db";
import { scanAndQueueReminders } from "@/services/reminder/reminder.service";
import { syncCronJobs } from "@/services/cronjob/cronjob.service";
import { requireCronSecret } from "@/plugins/auth";
import { processPrescriptionNotifications } from "@/services/whatsapp/prescription-notification.service";
import { processAppointmentNotifications } from "@/services/whatsapp/appointment-notification.service";
import { logger } from "@/lib/logger";

const CRON_TIMEOUT_MS = 25_000; // 25 seconds - leave buffer for 30s proxy timeout

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Entry point for the appointment reminder scheduler (cron-job.org pings this
 * every minute). Scans for appointments inside the reminder window and queues
 * WhatsApp reminders that the worker then sends ~30 minutes before each slot.
 */
export function registerCronRoutes(app: FastifyInstance): void {
  app.post("/api/cron/reminders", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;

    const startTime = Date.now();
    try {
      const db = await getDb();

      // Run with individual timeouts to prevent hanging
      const scanResult = await withTimeout(
        scanAndQueueReminders(db, new Date()),
        10_000,
        "scanAndQueueReminders"
      );

      await withTimeout(
        processPrescriptionNotifications(db),
        7_500,
        "processPrescriptionNotifications"
      );

      await withTimeout(
        processAppointmentNotifications(db),
        7_500,
        "processAppointmentNotifications"
      );

      const duration = Date.now() - startTime;
      logger.info("Cron reminders completed", { durationMs: duration, ...scanResult });
      return reply.send({ ok: true, ...scanResult, durationMs: duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Cron reminders error", { durationMs: duration, error: errorMessage });
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
        durationMs: duration,
      });
    }
  });

  app.post("/api/cron/sync", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;

    try {
      const result = await withTimeout(syncCronJobs(), 15_000, "syncCronJobs");
      return reply.send({ ok: true, ...result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Cron-job.org sync error", { error: errorMessage });
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });
}