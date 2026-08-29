import "../../scripts/bootstrap-env";
import { exec } from "node:child_process";
import type { Client } from "whatsapp-web.js";
import type { Db } from "mongodb";
import { logger } from "@/lib/logger";
import { now as nowFn } from "@/clinic/core/datetime";
import { getWhatsAppDb, closeAllPools } from "@/lib/db-pools";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { createWhatsAppClient } from "@/services/whatsapp/whatsapp.client";
import {
  LEGACY_SESSION_KEY,
  setSessionStage,
  writeQrFiles,
} from "@/services/whatsapp/whatsapp.session";
import {
  processSessionCommands,
  startConfiguredClinicSessions,
  startClinicSession,
  clinicSessionSnapshot,
  connectedClinicClients,
} from "@/services/whatsapp/whatsapp.session-manager";
import { listEnabledSessionConfigs } from "@/services/whatsapp/whatsapp-session.store";
import { handleIncomingMessage } from "@/services/whatsapp/whatsapp.message-handler";
import { processDueReminders, scanAndQueueReminders } from "@/services/reminder/reminder.service";
import { processDueNotificationsForClients } from "@/services/whatsapp/notification.service";

/**
 * WhatsApp worker.
 *
 * Runs every WhatsApp Web connection in this single process:
 * - the LEGACY central bot number (AI assistant + legacy reminders), and
 * - one notification-only connection per clinic that opted in.
 *
 * Clinic connections are managed via commands written by the API server into
 * `wa_session_commands` and are auto-restored from `wa_clinic_sessions` on
 * boot. See whatsapp.session-manager.ts.
 */

const REMINDER_POLL_MS = 30_000;
const COMMAND_POLL_MS = 2_000;
/** If the legacy client authenticates but never becomes ready, recycle it. */
const STUCK_AFTER_AUTH_MS = 90_000;
const MAX_RECONNECT_ATTEMPTS = 10;

let db: Awaited<ReturnType<typeof getWhatsAppDb>> | null = null;
let legacyClient: Client | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let reminderTimer: ReturnType<typeof setInterval> | null = null;
let commandTimer: ReturnType<typeof setInterval> | null = null;
let shuttingDown = false;
let readyWatchdog: ReturnType<typeof setTimeout> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;

// Self-heal: if the DB pool gets stuck on a dead network path, the per-tick
// retry alone won't recover it (the cached MongoClient keeps targeting the
// unreachable node). After enough consecutive failures we hard-reset the pool
// so the next operation re-establishes a fresh connection during a good
// network window.
let dbConsecutiveFailures = 0;
const DB_FAILURE_RESET_THRESHOLD = 5;

async function resetDbPool(): Promise<void> {
  try {
    await closeAllPools();
  } catch {
    /* best-effort */
  }
  try {
    db = await getWhatsAppDb();
    logger.info("whatsapp worker: DB pool reset after consecutive failures");
  } catch (err) {
    logger.error("whatsapp worker: DB pool reset failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  dbConsecutiveFailures = 0;
}

/**
 * Returns a DB handle that is verified alive with a cheap ping. If the ping
 * fails we hard-reset the pool (once per cooldown window) so the next call
 * returns a freshly established connection. This is the real recovery path:
 * the MongoDB driver keeps reusing a socket that looks ESTABLISHED but is
 * silently dead on the Atlas path, so serverSelection never trips and every
 * operation just hangs until it times out. A fresh socket during a good
 * network window fixes it. The shared-counter self-heal below is a fallback.
 */
let lastDbReset = 0;
async function getHealthyDb(): Promise<Db> {
  // Guard every await so this can never throw an unhandled rejection into the
  // interval callback (which would crash the worker). Whatever we return is
  // verified by the caller's own try/catch at the operation level.
  let candidate: Db | null = null;
  try {
    candidate = await getWhatsAppDb();
    await candidate.command({ ping: 1 });
    return candidate;
  } catch {
    /* ping failed — fall through to a pool reset below */
  }
  const now = Date.now();
  if (now - lastDbReset > 15_000) {
    lastDbReset = now;
    try {
      await resetDbPool();
    } catch {
      /* best-effort */
    }
  }
  try {
    return await getWhatsAppDb();
  } catch {
    // Last resort: hand back the possibly-wedged candidate so the caller's
    // operation fails loudly (and is retried next tick) instead of crashing us.
    if (candidate) return candidate;
    throw new Error("whatsapp DB handle unavailable");
  }
}

/**
 * Kills any Chromium processes left behind by previous crashed worker instances
 * that share our WhatsApp session paths. These zombies hold the profile lock
 * and the page binding, which makes the next client fail with
 * "onQRChangedEvent already exists" and crash the whole worker. Must run before
 * any client is started.
 */
function killOrphanedChromium(): void {
  const root = process.env.WHATSAPP_SESSION_PATH ?? "./whatsapp-session";
  const pattern = root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    exec(`pkill -f "${pattern}"`, () => {});
    logger.info("killed orphaned chromium processes for whatsapp session paths");
  } catch {
    /* best-effort */
  }
}

// ── Legacy central bot connection ────────────────────────────────────────────

function scheduleLegacyReconnect(): void {
  if (shuttingDown || reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error("legacy whatsapp reconnect attempts exhausted");
    return;
  }
  reconnectAttempts += 1;
  const delay = Math.min(30_000, 5_000 * reconnectAttempts);
  logger.warn("legacy whatsapp reconnect scheduled", { attempt: reconnectAttempts, delay });
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const old = legacyClient;
    legacyClient = null;
    // Intentional teardown: silence events so `disconnected` doesn't
    // schedule a second reconnect on top of the fresh start below.
    old?.removeAllListeners();
    void old?.destroy().catch(() => {});
    void startLegacyClient().catch(() => {
      logger.error("legacy whatsapp reconnect failed");
      scheduleLegacyReconnect();
    });
  }, delay);
}

function clearLegacyWatchdog(): void {
  if (readyWatchdog) {
    clearTimeout(readyWatchdog);
    readyWatchdog = null;
  }
}

function wireLegacyEvents(waClient: Client): void {
  waClient.on("qr", (qr) => {
    setSessionStage(LEGACY_SESSION_KEY, "qr");
    void writeQrFiles(LEGACY_SESSION_KEY, qr).then(({ txt, png }) => {
      logger.info("whatsapp qr code saved", { file: txt, png });
      process.stdout.write(
        "\n[WhatsApp AI] Scan the QR code with WhatsApp > Linked Devices.\n" +
          `QR text saved to: ${txt}\n` +
          `QR image saved to: ${png} (open this file and scan it)\n\n`
      );
    });
  });

  waClient.on("authenticated", () => {
    setSessionStage(LEGACY_SESSION_KEY, "authenticated");
    logger.info("whatsapp authenticated");
    clearLegacyWatchdog();
    readyWatchdog = setTimeout(() => {
      logger.error("whatsapp stuck after authentication; recycling legacy client");
      const old = legacyClient;
      legacyClient = null;
      clearLegacyWatchdog();
      old?.removeAllListeners();
      void old?.destroy().catch(() => {});
      void startLegacyClient().catch(() => scheduleLegacyReconnect());
    }, STUCK_AFTER_AUTH_MS);
  });

  waClient.on("ready", () => {
    clearLegacyWatchdog();
    setSessionStage(LEGACY_SESSION_KEY, "ready");
    reconnectAttempts = 0;
    logger.info("whatsapp connected");
  });

  waClient.on("auth_failure", (msg) => {
    setSessionStage(LEGACY_SESSION_KEY, "error");
    logger.error("whatsapp auth failure", { detail: String(msg).slice(0, 200) });
  });

  waClient.on("disconnected", (reason) => {
    clearLegacyWatchdog();
    setSessionStage(LEGACY_SESSION_KEY, "disconnected");
    logger.warn("whatsapp disconnected", { reason: String(reason) });
    scheduleLegacyReconnect();
  });

  waClient.on("message", (msg) => {
    void handleIncomingMessage(waClient, msg).catch((err) => {
      logger.error("whatsapp message handler error", {});
      logger.error(String(err), {});
    });
  });
}

async function startLegacyClient(): Promise<void> {
  const sessionPath =
    process.env.WHATSAPP_SESSION_PATH ?? "./whatsapp-session";
  const waClient = createWhatsAppClient({
    clientId: "ai-bot",
    dataPath: sessionPath,
  });
  legacyClient = waClient;
  wireLegacyEvents(waClient);
  setSessionStage(LEGACY_SESSION_KEY, "idle");
  await waClient.initialize().catch((err) => {
    // initialize() can reject on transient websock errors even though the
    // client later recovers; treat as failure only when it never came up.
    if (!waClient.info) throw err;
  });
}

// ── Background loops ─────────────────────────────────────────────────────────

function startReminderLoop(): void {
  if (reminderTimer) return;
  reminderTimer = setInterval(async () => {
    try {
      const db = await getHealthyDb();
      const org = await ensureDefaultOrganization(db);

      // Stage-only: scan and queue reminders into the DB.
      // NOTE: processPrescriptionNotifications and processAppointmentNotifications
      // are intentionally NOT called here. The cron HTTP endpoint
      // (POST /api/cron/reminders, pinged every minute by CronLite) is the
      // single owner of notification queue draining. Running them here too caused
      // both processes to race on the same MongoDB rows, producing duplicate
      // WhatsApp sends and stuck notifications.
      await scanAndQueueReminders(db, nowFn());

      // Deliveries need live connections, routed per clinic.
      const clientsByRoute = connectedClinicClients();
      if (legacyClient?.info) {
        clientsByRoute.set(LEGACY_SESSION_KEY, legacyClient);
        await processDueReminders(legacyClient, db, org.id);
      }
      await processDueNotificationsForClients(db, clientsByRoute);
      dbConsecutiveFailures = 0;
    } catch (err) {
      dbConsecutiveFailures += 1;
      logger.warn("reminder processing failed", {
        error: err instanceof Error ? err.message : "unknown",
        consecutiveFailures: dbConsecutiveFailures,
      });
      if (dbConsecutiveFailures >= DB_FAILURE_RESET_THRESHOLD) {
        void resetDbPool();
      }
    }
  }, REMINDER_POLL_MS);
}

function startCommandLoop(): void {
  if (commandTimer) return;
  commandTimer = setInterval(async () => {
    try {
      const db = await getHealthyDb();
      await processSessionCommands(db);
      dbConsecutiveFailures = 0;
    } catch (err) {
      dbConsecutiveFailures += 1;
      logger.warn("whatsapp command poll failed", {
        error: err instanceof Error ? err.message : "unknown",
        consecutiveFailures: dbConsecutiveFailures,
      });
      if (dbConsecutiveFailures >= DB_FAILURE_RESET_THRESHOLD) {
        void resetDbPool();
      }
    }
  }, COMMAND_POLL_MS);
}

/**
 * Self-healing watchdog. Runs every minute and guarantees the "always
 * connected, always in background" behaviour the product promises:
 *  - if the legacy bot client died without a pending reconnect, restart it;
 *  - for every clinic marked enabled in the DB, re-assert a live session if
 *    it has silently dropped out of the in-memory map (e.g. after a crash that
 *    pm2 restarted, or a process-level teardown). Re-asserting reuses the
 *    persisted LocalAuth folder, so an already-paired number reconnects with
 *    NO new QR scan.
 */
function startWatchdog(): void {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(async () => {
    try {
      const db = await getHealthyDb();
      if ((!legacyClient || !legacyClient.info) && !reconnectTimer) {
        logger.warn("watchdog: legacy whatsapp client not connected; restarting");
        void startLegacyClient().catch(() => scheduleLegacyReconnect());
      }

      const configs = await listEnabledSessionConfigs(db);
      for (const cfg of configs) {
        const snap = clinicSessionSnapshot(cfg.clinicId);
        if (snap.active) continue; // still tracked; its own reconnect handles it
        logger.warn("watchdog: clinic whatsapp session dropped; re-asserting", {
          clinicId: cfg.clinicId,
        });
        await startClinicSession(db, cfg.clinicId).catch((err) => {
          logger.error("watchdog: failed to re-assert clinic session", {
            clinicId: cfg.clinicId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    } catch (err) {
      dbConsecutiveFailures += 1;
      logger.warn("watchdog tick failed", {
        error: err instanceof Error ? err.message : "unknown",
        consecutiveFailures: dbConsecutiveFailures,
      });
      if (dbConsecutiveFailures >= DB_FAILURE_RESET_THRESHOLD) {
        void resetDbPool();
      }
    }
  }, 60_000);
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info("whatsapp worker starting");
  // Clear any Chromium zombies from a previous crashed run BEFORE starting
  // clients — otherwise the new clients inherit the dead page binding and crash.
  killOrphanedChromium();
  db = await getWhatsAppDb();
  await ensureDefaultOrganization(db);
  await startLegacyClient();

  // Restore every clinic connection marked enabled before the restart.
  const restored = await startConfiguredClinicSessions(db);
  if (restored > 0) {
    logger.info("clinic whatsapp sessions restored", { count: restored });
  }

  startReminderLoop();
  startCommandLoop();
  startWatchdog();

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("whatsapp worker shutting down");
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (reminderTimer) clearInterval(reminderTimer);
    if (commandTimer) clearInterval(commandTimer);
    if (watchdogTimer) clearInterval(watchdogTimer);
    clearLegacyWatchdog();
    if (legacyClient) {
      legacyClient.removeAllListeners();
      await legacyClient.destroy().catch(() => {});
    }
    const clients = connectedClinicClients();
    await Promise.all([...clients.values()].map((c) => c.destroy().catch(() => {})));
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error("whatsapp worker failed to start", {});
  logger.error(String(err), {});
  process.exit(1);
});
