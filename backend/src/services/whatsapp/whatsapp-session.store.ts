import type { Db } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";

/**
 * Durable per-clinic WhatsApp connection record (`wa_clinic_sessions`).
 *
 * The WhatsApp connection itself lives in the standalone whatsapp-gateway;
 * this record mirrors what the dashboard needs to show (enabled flag, connected
 * number, last connect/disconnect) and is updated from the gateway's status
 * webhook (POST /api/whatsapp/status).
 */

export const WA_CLINIC_SESSIONS_COLLECTION = "wa_clinic_sessions";

export interface ClinicSessionConfigDoc {
  clinicId: string;
  /** When true the clinic wants its WhatsApp number connected (the gateway auto-restores it). */
  enabled: boolean;
  /** WhatsApp number of the connected device, as reported by the gateway. */
  phone: string | null;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  const now = nowFn();
  await db.collection<ClinicSessionConfigDoc>(WA_CLINIC_SESSIONS_COLLECTION).updateOne(
    { clinicId },
    {
      $set: { ...patch, updatedAt: now },
      $setOnInsert: { clinicId, createdAt: now },
    },
    { upsert: true }
  );
}
