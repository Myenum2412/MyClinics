import "../../scripts/bootstrap-env";
import type { Client } from "whatsapp-web.js";
import { logger } from "@/lib/logger";
import { getWhatsAppDb } from "@/lib/db-pools";
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
  connectedClinicClients,
} from "@/services/whatsapp/whatsapp.session-manager";
import { handleIncomingMessage } from "@/services/whatsapp/whatsapp.message-handler";
import { processDueReminders, scanAndQueueReminders } from "@/services/reminder/reminder.service";
import { processDueNotificationsForClients } from "@/services/whatsapp/notification.service";
import { processPrescriptionNotifications } from "@/services/whatsapp/prescription-notification.service";
import { processAppointmentNotifications } from "@/services/whatsapp/appointment-notification.service";

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
const COMMAND_POLL_MS = 5_000;
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

function startReminderLoop(db: Awaited<ReturnType<typeof getWhatsAppDb>>): void {
  if (reminderTimer) return;
  reminderTimer = setInterval(async () => {
    try {
      const org = await ensureDefaultOrganization(db);

      // Staging scans/processors only touch the database.
      await scanAndQueueReminders(db, new Date());
      await processPrescriptionNotifications(db);
      await processAppointmentNotifications(db);

      // Deliveries need live connections, routed per clinic.
      const clientsByRoute = connectedClinicClients();
      if (legacyClient?.info) {
        clientsByRoute.set(LEGACY_SESSION_KEY, legacyClient);
        await processDueReminders(legacyClient, db, org.id);
      }
      await processDueNotificationsForClients(db, clientsByRoute);
    } catch (err) {
      logger.warn("reminder processing failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }, REMINDER_POLL_MS);
}

function startCommandLoop(db: Awaited<ReturnType<typeof getWhatsAppDb>>): void {
  if (commandTimer) return;
  commandTimer = setInterval(async () => {
    try {
      await processSessionCommands(db);
    } catch (err) {
      logger.warn("whatsapp command poll failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }, COMMAND_POLL_MS);
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info("whatsapp worker starting");
  db = await getWhatsAppDb();
  await ensureDefaultOrganization(db);
  await startLegacyClient();

  // Restore every clinic connection marked enabled before the restart.
  const restored = await startConfiguredClinicSessions(db);
  if (restored > 0) {
    logger.info("clinic whatsapp sessions restored", { count: restored });
  }

  startReminderLoop(db);
  startCommandLoop(db);

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("whatsapp worker shutting down");
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (reminderTimer) clearInterval(reminderTimer);
    if (commandTimer) clearInterval(commandTimer);
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
