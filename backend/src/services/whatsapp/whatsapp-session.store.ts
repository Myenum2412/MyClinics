import type { Db, ObjectId } from "mongodb";

/**
 * Persistence layer for per-clinic WhatsApp Web connections.
 *
 * The API server and the WhatsApp worker are separate processes. The API
 * writes commands here; the worker polls them and starts/stops/destroys the
 * matching Puppeteer client. Durable per-connection config (enabled flag,
 * connected phone) also lives here so the worker can auto-start sessions
 * after a restart.
 *
 * This module intentionally has no whatsapp-web.js imports so the API server
 * never loads Puppeteer through it.
 */

export const WA_SESSION_COMMANDS_COLLECTION = "wa_session_commands";
export const WA_CLINIC_SESSIONS_COLLECTION = "wa_clinic_sessions";

export type SessionCommandAction = "connect" | "disconnect" | "logout";

export interface SessionCommandDoc {
  _id?: ObjectId;
  clinicId: string;
  action: SessionCommandAction;
  status: "pending" | "done" | "error";
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

export interface ClinicSessionConfigDoc {
  clinicId: string;
  /** When true the worker auto-starts (and reconnects) this connection. */
  enabled: boolean;
  /** WhatsApp number of the connected device, as reported by the client. */
  phone: string | null;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Queues a start/stop/logout request for the worker to pick up. */
export async function enqueueSessionCommand(
  db: Db,
  clinicId: string,
  action: SessionCommandAction
): Promise<void> {
  await db.collection<SessionCommandDoc>(WA_SESSION_COMMANDS_COLLECTION).insertOne({
    clinicId,
    action,
    status: "pending",
    error: null,
    createdAt: new Date(),
    processedAt: null,
  });
}

/** Claims the oldest pending commands (single worker consumes them). */
export async function claimPendingSessionCommands(
  db: Db,
  limit = 10
): Promise<SessionCommandDoc[]> {
  return db
    .collection<SessionCommandDoc>(WA_SESSION_COMMANDS_COLLECTION)
    .find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
}

export async function completeSessionCommand(
  db: Db,
  command: SessionCommandDoc,
  error?: string
): Promise<void> {
  await db.collection<SessionCommandDoc>(WA_SESSION_COMMANDS_COLLECTION).updateOne(
    { _id: command._id },
    {
      $set: {
        status: error ? "error" : "done",
        error: error ?? null,
        processedAt: new Date(),
      },
    }
  );
}

export async function getSessionConfig(
  db: Db,
  clinicId: string
): Promise<ClinicSessionConfigDoc | null> {
  return db.collection<ClinicSessionConfigDoc>(WA_CLINIC_SESSIONS_COLLECTION).findOne({ clinicId });
}

export async function listEnabledSessionConfigs(db: Db): Promise<ClinicSessionConfigDoc[]> {
  return db
    .collection<ClinicSessionConfigDoc>(WA_CLINIC_SESSIONS_COLLECTION)
    .find({ enabled: true })
    .toArray();
}

/** Upserts the durable config, preserving the first-seen timestamps. */
export async function upsertSessionConfig(
  db: Db,
  clinicId: string,
  patch: Partial<Pick<ClinicSessionConfigDoc, "enabled" | "phone" | "lastConnectedAt" | "lastDisconnectedAt">>
): Promise<void> {
  const now = new Date();
  await db.collection<ClinicSessionConfigDoc>(WA_CLINIC_SESSIONS_COLLECTION).updateOne(
    { clinicId },
    {
      $set: { ...patch, updatedAt: now },
      $setOnInsert: { clinicId, createdAt: now },
    },
    { upsert: true }
  );
}
