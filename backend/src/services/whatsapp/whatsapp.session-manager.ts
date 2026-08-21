import type { Client } from "whatsapp-web.js";
import { logger } from "@/lib/logger";
import type { Db } from "mongodb";
import { createWhatsAppClient } from "@/services/whatsapp/whatsapp.client";
import {
  setSessionStage,
  writeQrFiles,
  sessionDirForKey,
  clearSessionArtifacts,
} from "@/services/whatsapp/whatsapp.session";
import {
  claimPendingSessionCommands,
  completeSessionCommand,
  listEnabledSessionConfigs,
  upsertSessionConfig,
  type SessionCommandDoc,
} from "@/services/whatsapp/whatsapp-session.store";

/**
 * Owns every per-clinic WhatsApp Web connection inside the worker process.
 *
 * Each clinic gets its own whatsapp-web.js Client (own LocalAuth folder, own
 * QR pairing, own reconnect loop). Connections are driven by commands the API
 * server writes into `wa_session_commands`; durable state lives in
 * `wa_clinic_sessions` so sessions survive worker restarts.
 *
 * Clinic connections are NOTIFICATION-ONLY: they deliberately do not answer
 * incoming messages. The AI assistant remains on the legacy central number.
 */

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY_MS = 5_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
/** If a client authenticates but never becomes ready, recycle just that client. */
const STUCK_AFTER_AUTH_MS = 90_000;
const DESTROY_TIMEOUT_MS = 15_000;
const BOOT_START_STAGGER_MS = 2_000;

function maxClinicSessions(): number {
  const parsed = Number(process.env.WHATSAPP_MAX_CLINIC_SESSIONS ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 20;
}

interface ManagedSession {
  clinicId: string;
  client: Client;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectAttempts: number;
  readyWatchdog: ReturnType<typeof setTimeout> | null;
  /** Set while intentionally shutting down — suppresses reconnects. */
  stopping: boolean;
}

const sessions = new Map<string, ManagedSession>();

export function isClinicSessionActive(clinicId: string): boolean {
  return sessions.has(clinicId);
}

export function connectedClinicCount(): number {
  return [...sessions.values()].filter((s) => Boolean(s.client.info)).length;
}

/** Clients that are ready to send, keyed by clinicId. */
export function connectedClinicClients(): Map<string, Client> {
  const map = new Map<string, Client>();
  for (const [clinicId, session] of sessions) {
    if (session.client.info) map.set(clinicId, session.client);
  }
  return map;
}

export function clinicSessionPhone(clinicId: string): string | null {
  return sessions.get(clinicId)?.client.info?.me?.user ?? null;
}

function clearTimers(session: ManagedSession): void {
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }
  if (session.readyWatchdog) {
    clearTimeout(session.readyWatchdog);
    session.readyWatchdog = null;
  }
}

async function destroyClient(client: Client): Promise<void> {
  await Promise.race([
    client.destroy().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, DESTROY_TIMEOUT_MS)),
  ]);
}

function scheduleReconnect(db: Db, session: ManagedSession): void {
  if (session.stopping || session.reconnectTimer) return;
  if (session.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error("clinic whatsapp reconnect attempts exhausted", {
      clinicId: session.clinicId,
    });
    setSessionStage(session.clinicId, "error");
    return;
  }
  session.reconnectAttempts += 1;
  const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * session.reconnectAttempts);
  logger.warn("clinic whatsapp reconnect scheduled", {
    clinicId: session.clinicId,
    attempt: session.reconnectAttempts,
    delay,
  });
  session.reconnectTimer = setTimeout(() => {
    session.reconnectTimer = null;
    void restartClinicSession(db, session.clinicId).catch((err) => {
      logger.error("clinic whatsapp reconnect failed", {
        clinicId: session.clinicId,
        error: err instanceof Error ? err.message : String(err),
      });
      scheduleReconnect(db, session);
    });
  }, delay);
}

function wireEvents(db: Db, session: ManagedSession): void {
  const { clinicId, client } = session;

  client.on("qr", (qr) => {
    setSessionStage(clinicId, "qr");
    void writeQrFiles(clinicId, qr)
      .then(({ txt, png }) => {
        logger.info("clinic whatsapp qr saved", { clinicId, txt, png });
      })
      .catch(() => {});
  });

  client.on("authenticated", () => {
    setSessionStage(clinicId, "authenticated");
    logger.info("clinic whatsapp authenticated", { clinicId });
    if (session.readyWatchdog) clearTimeout(session.readyWatchdog);
    session.readyWatchdog = setTimeout(() => {
      logger.error("clinic whatsapp stuck after authentication; recycling client", { clinicId });
      void restartClinicSession(db, clinicId).catch(() => {});
    }, STUCK_AFTER_AUTH_MS);
  });

  client.on("ready", () => {
    if (session.readyWatchdog) {
      clearTimeout(session.readyWatchdog);
      session.readyWatchdog = null;
    }
    setSessionStage(clinicId, "ready");
    session.reconnectAttempts = 0;
    const phone = client.info?.me?.user ?? null;
    logger.info("clinic whatsapp connected", { clinicId, phone });
    void upsertSessionConfig(db, clinicId, {
      enabled: true,
      phone,
      lastConnectedAt: new Date(),
    }).catch(() => {});
  });

  client.on("auth_failure", (msg) => {
    setSessionStage(clinicId, "error");
    logger.error("clinic whatsapp auth failure", {
      clinicId,
      detail: String(msg).slice(0, 200),
    });
  });

  client.on("disconnected", (reason) => {
    if (session.readyWatchdog) {
      clearTimeout(session.readyWatchdog);
      session.readyWatchdog = null;
    }
    setSessionStage(clinicId, "disconnected");
    logger.warn("clinic whatsapp disconnected", { clinicId, reason: String(reason) });
    void upsertSessionConfig(db, clinicId, { lastDisconnectedAt: new Date() }).catch(() => {});
    scheduleReconnect(db, session);
  });

  // Notification-only connection: incoming messages are intentionally ignored.
}

/**
 * Starts (or replaces) the WhatsApp Web client for one clinic. Resolves once
 * initialization has been kicked off — readiness arrives via events.
 */
export async function startClinicSession(db: Db, clinicId: string): Promise<void> {
  const existing = sessions.get(clinicId);
  if (existing) {
    if (existing.client.info) {
      logger.info("clinic whatsapp already connected; skipping start", { clinicId });
      return;
    }
    // Replace a dead/errored client instance.
    clearTimers(existing);
    existing.stopping = true;
    sessions.delete(clinicId);
    await destroyClient(existing.client).catch(() => {});
  }

  if (sessions.size >= maxClinicSessions()) {
    throw new Error(
      `clinic whatsapp session limit reached (${maxClinicSessions()}); raise WHATSAPP_MAX_CLINIC_SESSIONS`
    );
  }

  const client = createWhatsAppClient({
    clientId: `clinic-${clinicId}`,
    dataPath: sessionDirForKey(clinicId),
  });
  const session: ManagedSession = {
    clinicId,
    client,
    reconnectTimer: null,
    reconnectAttempts: existing?.reconnectAttempts ?? 0,
    readyWatchdog: null,
    stopping: false,
  };
  sessions.set(clinicId, session);
  wireEvents(db, session);
  setSessionStage(clinicId, "idle");

  try {
    await client.initialize();
  } catch (err) {
    // initialize() can reject on transient websock errors even though the
    // client later recovers; only clean up when the client never came up.
    if (!client.info && sessions.get(clinicId) === session) {
      sessions.delete(clinicId);
      clearTimers(session);
      setSessionStage(clinicId, "error");
      throw err;
    }
  }
}

async function restartClinicSession(db: Db, clinicId: string): Promise<void> {
  const existing = sessions.get(clinicId);
  if (existing) {
    clearTimers(existing);
    existing.stopping = true;
    sessions.delete(clinicId);
    await destroyClient(existing.client).catch(() => {});
  }
  await startClinicSession(db, clinicId);
}

/** Stops a clinic connection. `logout` also unlinks the device and wipes the paired session. */
export async function stopClinicSession(
  db: Db,
  clinicId: string,
  options: { logout?: boolean } = {}
): Promise<void> {
  const session = sessions.get(clinicId);
  if (session) {
    clearTimers(session);
    session.stopping = true;
    sessions.delete(clinicId);
    try {
      if (options.logout) {
        await Promise.race([
          session.client.logout().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, DESTROY_TIMEOUT_MS)),
        ]);
      }
    } finally {
      await destroyClient(session.client);
    }
  }

  if (options.logout) {
    clearSessionArtifacts(clinicId);
    await upsertSessionConfig(db, clinicId, {
      enabled: false,
      phone: null,
      lastDisconnectedAt: new Date(),
    });
  }
  setSessionStage(clinicId, options.logout ? "idle" : "disconnected");
  logger.info("clinic whatsapp stopped", { clinicId, logout: Boolean(options.logout) });
}

/** Executes one API-issued command. Throws on failure so it's marked error. */
async function runSessionCommand(db: Db, command: SessionCommandDoc): Promise<void> {
  switch (command.action) {
    case "connect":
      await upsertSessionConfig(db, command.clinicId, { enabled: true });
      await startClinicSession(db, command.clinicId);
      break;
    case "disconnect":
      await stopClinicSession(db, command.clinicId, { logout: false });
      break;
    case "logout":
      await stopClinicSession(db, command.clinicId, { logout: true });
      break;
    default:
      logger.warn("unknown whatsapp session command", { action: String(command.action) });
  }
}

/** Polls the commands collection; called on an interval from the worker. */
export async function processSessionCommands(db: Db): Promise<number> {
  const commands = await claimPendingSessionCommands(db);
  for (const command of commands) {
    try {
      await runSessionCommand(db, command);
      await completeSessionCommand(db, command);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("clinic whatsapp command failed", {
        clinicId: command.clinicId,
        action: command.action,
        error: message,
      });
      setSessionStage(command.clinicId, "error");
      await completeSessionCommand(db, command, message);
    }
  }
  return commands.length;
}

/**
 * Boot-time recovery: reopens every connection marked enabled. Starts are
 * staggered so we don't spawn dozens of Chromium processes simultaneously.
 */
export async function startConfiguredClinicSessions(db: Db): Promise<number> {
  let started = 0;
  try {
    const configs = await listEnabledSessionConfigs(db);
    for (const config of configs) {
      try {
        await startClinicSession(db, config.clinicId);
        started += 1;
      } catch (err) {
        logger.error("failed to auto-start clinic whatsapp session", {
          clinicId: config.clinicId,
          error: err instanceof Error ? err.message : String(err),
        });
        setSessionStage(config.clinicId, "error");
      }
      await new Promise((resolve) => setTimeout(resolve, BOOT_START_STAGGER_MS));
    }
  } catch (err) {
    logger.error("failed to load clinic whatsapp configs", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return started;
}

export function clinicSessionSnapshot(clinicId: string): {
  active: boolean;
  connected: boolean;
  phone: string | null;
} {
  const session = sessions.get(clinicId);
  return {
    active: Boolean(session),
    connected: Boolean(session?.client.info),
    phone: session?.client.info?.me?.user ?? null,
  };
}
