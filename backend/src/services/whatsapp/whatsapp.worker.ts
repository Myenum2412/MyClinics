import "../../scripts/bootstrap-env";
import { now as nowFn } from "@/clinic/core/datetime";
import { getWhatsAppDb } from "@/lib/db-pools";
import { logger } from "@/lib/logger";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { getGatewayConfig } from "@/services/whatsapp/gateway/config";
import { drainNotificationsViaGateway } from "@/services/whatsapp/gateway/drain";
import { processDueReminders, scanAndQueueReminders } from "@/services/reminder/reminder.service";

/**
 * WhatsApp delivery worker.
 *
 * Holds NO WhatsApp connection (no browser): those live in the standalone
 * whatsapp-gateway. This process only moves work into it:
 *  - every DRAIN_POLL_MS: hands queued `wa_notifications` (appointment events,
 *    reports, prescriptions, digests, ...) to the gateway;
 *  - every REMINDER_POLL_MS: scans for upcoming appointments and queues the
 *    platform-level reminders.
 * Patient chat (the menu bot) is handled by the API's /api/whatsapp/inbound webhook.
 */

const DRAIN_POLL_MS = 5_000;
const REMINDER_POLL_MS = 30_000;

let drainTimer: ReturnType<typeof setInterval> | null = null;
let reminderTimer: ReturnType<typeof setInterval> | null = null;
let shuttingDown = false;

/** Runs `task` on an interval, never overlapping with itself and never crashing the process. */
function every(ms: number, label: string, task: () => Promise<void>): ReturnType<typeof setInterval> {
  let running = false;
  let fails = 0;
  return setInterval(async () => {
    if (running || shuttingDown) return;
    running = true;
    try {
      await task();
      fails = 0;
    } catch (err) {
      fails += 1;
      logger.warn(`${label} failed`, { error: err instanceof Error ? err.message : "unknown", consecutiveFailures: fails });
    } finally {
      running = false;
    }
  }, ms);
}

async function main(): Promise<void> {
  logger.info("whatsapp worker starting");
  if (!getGatewayConfig()) {
    logger.warn("GATEWAY_URL / GATEWAY_SECRET not set: WhatsApp messages will stay queued until they are configured");
  }
  const db = await getWhatsAppDb();
  await ensureDefaultOrganization(db);

  drainTimer = every(DRAIN_POLL_MS, "notification drain", async () => {
    const dbh = await getWhatsAppDb();
    await drainNotificationsViaGateway(dbh);
  });

  reminderTimer = every(REMINDER_POLL_MS, "reminder processing", async () => {
    const dbh = await getWhatsAppDb();
    const org = await ensureDefaultOrganization(dbh);
    // Stage-only scan; the cron HTTP endpoint (POST /api/cron/reminders) owns draining the tenant
    // event/reminder tables into wa_notifications, which the loop above delivers.
    await scanAndQueueReminders(dbh, nowFn());
    await processDueReminders(dbh, org.id);
  });

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("whatsapp worker shutting down");
    if (drainTimer) clearInterval(drainTimer);
    if (reminderTimer) clearInterval(reminderTimer);
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error("whatsapp worker failed to start", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
