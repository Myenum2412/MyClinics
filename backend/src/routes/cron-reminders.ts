import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db";
import { scanAndQueueReminders } from "@/services/reminder/reminder.service";
import { requireCronSecret } from "@/plugins/auth";

/**
 * Entry point for the appointment reminder scheduler (cron-job.org pings this
 * every minute). Scans for appointments inside the reminder window and queues
 * WhatsApp reminders that the worker then sends ~30 minutes before each slot.
 */
export function registerCronRoutes(app: FastifyInstance): void {
  app.post("/api/cron/reminders", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;

    try {
      const db = await getDb();
      const result = await scanAndQueueReminders(db, new Date());
      return reply.send({ ok: true, ...result });
    } catch (error) {
      console.error("Cron reminders error", error);
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });
}