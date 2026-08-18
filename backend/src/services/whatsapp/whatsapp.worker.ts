import "../../scripts/bootstrap-env";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import type { Client } from "whatsapp-web.js";
import { logger } from "@/lib/logger";
import { getDb } from "@/lib/db";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { createWhatsAppClient } from "@/services/whatsapp/whatsapp.client";
import { setSessionStage } from "@/services/whatsapp/whatsapp.session";
import { handleIncomingMessage } from "@/services/whatsapp/whatsapp.message-handler";
import { processDueReminders, scanAndQueueReminders } from "@/services/reminder/reminder.service";
import { processDueNotifications } from "@/services/whatsapp/notification.service";
import { processPrescriptionNotifications } from "@/services/whatsapp/prescription-notification.service";
import { processAppointmentNotifications } from "@/services/whatsapp/appointment-notification.service";

const MAX_RECONNECT_ATTEMPTS = 10;
const REMINDER_POLL_MS = 30_000;
/** If the client authenticates but never becomes ready, exit so pm2 restarts it. */
const STUCK_AFTER_AUTH_MS = 90_000;
const sessionDir = process.env.WHATSAPP_SESSION_PATH ?? "./whatsapp-session";

let client: Client | null = null;
let db: Awaited<ReturnType<typeof getDb>> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let reminderTimer: ReturnType<typeof setInterval> | null = null;

function startReminderLoop(db: Awaited<ReturnType<typeof getDb>>): void {
  if (reminderTimer) return;
  reminderTimer = setInterval(async () => {
    if (!client?.info) return;
    try {
      const org = await ensureDefaultOrganization(db);
      await scanAndQueueReminders(db, new Date());
      await processPrescriptionNotifications(db);
      await processAppointmentNotifications(db);
      await processDueReminders(client, db, org.id);
      await processDueNotifications(client, db, org.id);
    } catch (err) {
      logger.warn("reminder processing failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }, REMINDER_POLL_MS);
}

function writeQr(qr: string): void {
  const file = join(sessionDir, "qr.txt");
  const png = join(sessionDir, "qr.png");
  try {
    writeFileSync(file, qr, "utf-8");
    void QRCode.toFile(png, qr, { width: 400 }).catch(() => {});
    logger.info("whatsapp qr code saved", { file, png });
  } catch {
    logger.info("whatsapp qr code (could not write file)", {});
  }
  process.stdout.write(
    "\n[WhatsApp AI] Scan the QR code with WhatsApp > Linked Devices.\n" +
      `QR text saved to: ${file}\n` +
      `QR image saved to: ${png} (open this file and scan it)\n\n`
  );
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error("whatsapp reconnect attempts exhausted");
    return;
  }
  reconnectAttempts += 1;
  const delay = Math.min(30_000, 5_000 * reconnectAttempts);
  logger.warn("whatsapp reconnect scheduled", { attempt: reconnectAttempts, delay });
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const old = client;
    client = null;
    void old?.destroy().catch(() => {});
    void startClient().catch(() => {
      logger.error("whatsapp reconnect failed");
      scheduleReconnect();
    });
  }, delay);
}

let readyWatchdog: ReturnType<typeof setTimeout> | null = null;

function clearReadyWatchdog(): void {
  if (readyWatchdog) {
    clearTimeout(readyWatchdog);
    readyWatchdog = null;
  }
}

function wireEvents(waClient: Client): void {
  waClient.on("qr", (qr) => {
    setSessionStage("qr");
    writeQr(qr);
  });

  waClient.on("authenticated", () => {
    setSessionStage("authenticated");
    logger.info("whatsapp authenticated");
    clearReadyWatchdog();
    readyWatchdog = setTimeout(() => {
      logger.error(
        "whatsapp stuck after authentication; exiting so pm2 restarts it"
      );
      process.exit(1);
    }, STUCK_AFTER_AUTH_MS);
  });

  waClient.on("ready", () => {
    clearReadyWatchdog();
    setSessionStage("ready");
    reconnectAttempts = 0;
    logger.info("whatsapp connected");
    if (db) startReminderLoop(db);
  });

  waClient.on("auth_failure", (msg) => {
    setSessionStage("error");
    logger.error("whatsapp auth failure", { detail: String(msg).slice(0, 200) });
  });

  waClient.on("disconnected", (reason) => {
    clearReadyWatchdog();
    setSessionStage("disconnected");
    logger.warn("whatsapp disconnected", { reason: String(reason) });
    scheduleReconnect();
  });

  waClient.on("message", (msg) => {
    void handleIncomingMessage(waClient, msg).catch((err) => {
      logger.error("whatsapp message handler error", {});
      logger.error(String(err), {});
    });
  });
}

async function startClient(): Promise<void> {
  const waClient = createWhatsAppClient();
  client = waClient;
  wireEvents(waClient);
  setSessionStage("idle");
  await waClient.initialize();
}

async function main(): Promise<void> {
  logger.info("whatsapp worker starting");
  db = await getDb();
  await ensureDefaultOrganization(db);
  await startClient();

  const shutdown = async () => {
    logger.info("whatsapp worker shutting down");
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (reminderTimer) clearInterval(reminderTimer);
    if (client) await client.destroy().catch(() => {});
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
