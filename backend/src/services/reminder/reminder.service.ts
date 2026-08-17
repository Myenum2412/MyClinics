import type { Client } from "whatsapp-web.js";
import type { Db, ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { todayDateString } from "@/lib/stats";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { toWhatsAppRemoteId } from "@/lib/phone";
import { sendWithTimeout } from "@/services/whatsapp/send.utils";
export { toWhatsAppRemoteId } from "@/lib/phone";

export const REMINDERS_COLLECTION = "reminders";
export const REMINDER_MINUTES_BEFORE = 30;
/** Reminder fires on the first poll inside this window (minutes until the slot). */
export const REMINDER_WINDOW_MIN = 20;
export const REMINDER_WINDOW_MAX = 40;
const MAX_ATTEMPTS = 3;

export type ReminderStatus = "queued" | "sent" | "failed";

export interface ReminderDoc {
  appointmentId: string;
  organizationId: string;
  patientName: string;
  phone: string | null;
  remoteId: string | null;
  date: string;
  time: string;
  doctorName: string | null;
  message: string;
  status: ReminderStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

export interface DueAppointment {
  appointmentId: string;
  fullName: string;
  phone: string | null;
  whatsapp: string | null;
  date: string;
  time: string;
  doctorName: string | null;
}

/** Minutes from `now` until the appointment's date+time (local time). */
export function minutesUntil(date: string, time: string, now: Date): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (
    [y, m, d, hh, mm].some((n) => Number.isNaN(n)) ||
    m < 1 || m > 12 || d < 1 || d > 31 || hh < 0 || hh > 23 || mm < 0 || mm > 59
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const at = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Math.round((at.getTime() - now.getTime()) / 60_000);
}

function buildReminderText(
  appt: { fullName: string; time: string; doctorName: string | null },
  clinicName: string
): string {
  const firstName = appt.fullName.split(" ")[0] || "there";
  const doctor = appt.doctorName ? ` with ${appt.doctorName}` : "";
  return [
    `Hi ${firstName},`,
    "",
    `This is a reminder from ${clinicName} about your appointment today at ${appt.time}${doctor}.`,
    "",
    "Please arrive 10 minutes before your appointment.",
    "",
    "Reply here if you need to reschedule or cancel.",
  ].join("\n");
}

/**
 * Appointments whose slot is inside the reminder window and not yet reminded.
 * The time window is computed in MongoDB (with a projection), falling back to
 * a full-day scan only when the window crosses midnight.
 */
export async function findDueAppointments(
  db: Db,
  now: Date
): Promise<DueAppointment[]> {
  const today = todayDateString();
  const windowStart = new Date(now.getTime() + REMINDER_WINDOW_MIN * 60_000);
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MAX * 60_000);
  const startHH = `${String(windowStart.getHours()).padStart(2, "0")}:${String(
    windowStart.getMinutes()
  ).padStart(2, "0")}`;
  const endHH = `${String(windowEnd.getHours()).padStart(2, "0")}:${String(
    windowEnd.getMinutes()
  ).padStart(2, "0")}`;

  const query: Record<string, unknown> = {
    date: today,
    status: { $in: ["confirmed", "pending"] },
  };
  // Window crosses midnight on the same calendar day — fall back to scanning
  // the (small) set of today's appointments and filtering in JS.
  const crossesMidnight = startHH > endHH;
  if (!crossesMidnight) {
    query.time = { $gte: startHH, $lte: endHH };
  }

  const docs = await db
    .collection("appointments")
    .find(query, {
      projection: {
        fullName: 1,
        mobile: 1,
        whatsapp: 1,
        date: 1,
        time: 1,
        doctorName: 1,
      },
    })
    .toArray();

  const due: DueAppointment[] = [];
  for (const doc of docs) {
    const mins = minutesUntil(String(doc.date), String(doc.time), now);
    if (mins < REMINDER_WINDOW_MIN || mins > REMINDER_WINDOW_MAX) continue;
    due.push({
      appointmentId: (doc._id as { toString(): string }).toString(),
      fullName: String(doc.fullName ?? ""),
      phone: doc.mobile ? String(doc.mobile) : null,
      whatsapp: doc.whatsapp ? String(doc.whatsapp) : null,
      date: String(doc.date),
      time: String(doc.time),
      doctorName: doc.doctorName ? String(doc.doctorName) : null,
    });
  }
  return due;
}

/** Queues one reminder per appointment. Duplicates are skipped. */
export async function queueReminders(
  db: Db,
  organizationId: string,
  clinicName: string,
  due: DueAppointment[]
): Promise<{ queued: number; skipped: number }> {
  const collection = db.collection(REMINDERS_COLLECTION);
  await collection.createIndex({ appointmentId: 1 }, { unique: true });

  // Single query for already-queued ids, then one bulk insert for the rest.
  const existing = await collection
    .find(
      {
        appointmentId: { $in: due.map((a) => a.appointmentId) },
      },
      { projection: { appointmentId: 1 } }
    )
    .toArray();
  const existingIds = new Set(existing.map((d) => String(d.appointmentId)));

  const docs: ReminderDoc[] = [];
  for (const appt of due) {
    if (existingIds.has(appt.appointmentId)) continue;
    const remoteId =
      toWhatsAppRemoteId(appt.whatsapp) ?? toWhatsAppRemoteId(appt.phone);
    docs.push({
      appointmentId: appt.appointmentId,
      organizationId,
      patientName: appt.fullName,
      phone: appt.phone,
      remoteId,
      date: appt.date,
      time: appt.time,
      doctorName: appt.doctorName,
      message: buildReminderText(appt, clinicName),
      status: "queued",
      attempts: 0,
      lastError: remoteId ? null : "No WhatsApp number for this patient",
      createdAt: new Date(),
      sentAt: null,
    });
  }

  if (!docs.length) return { queued: 0, skipped: due.length };

  try {
    const result = await collection.insertMany(docs, { ordered: false });
    return {
      queued: result.insertedCount,
      skipped: due.length - result.insertedCount,
    };
  } catch (err) {
    // Duplicate key on appointmentId — a concurrent scan queued some already.
    if (err instanceof Error && /duplicate key/i.test(err.message)) {
      const result = await collection.countDocuments({
        appointmentId: { $in: docs.map((d) => d.appointmentId) },
      });
      return { queued: result, skipped: due.length - result };
    }
    throw err;
  }
}

/** Finds due appointments for the default organization and queues reminders. */
export async function scanAndQueueReminders(
  db: Db,
  now: Date
): Promise<{ checked: number; queued: number; skipped: number }> {
  const org = await ensureDefaultOrganization(db);
  const due = await findDueAppointments(db, now);
  const result = await queueReminders(db, org.id, org.name, due);
  return { checked: due.length, ...result };
}

/** Sends queued reminders through the connected WhatsApp client. */
export async function processDueReminders(
  client: Client,
  db: Db,
  organizationId: string
): Promise<{ sent: number; failed: number; pending: number }> {
  if (!client.info) return { sent: 0, failed: 0, pending: 0 };

  const queued = await db
    .collection<ReminderDoc>(REMINDERS_COLLECTION)
    .find({ organizationId, status: "queued" })
    .limit(20)
    .toArray();

  let sent = 0;
  let failed = 0;
  const updates: {
    filter: { _id: ObjectId };
    update: Record<string, unknown>;
  }[] = [];

  for (const reminder of queued) {
    if (!reminder.remoteId) {
      updates.push({
        filter: { _id: reminder._id },
        update: { $set: { status: "failed", attempts: reminder.attempts + 1 } },
      });
      failed += 1;
      continue;
    }
    try {
      await sendWithTimeout(client, reminder.remoteId, reminder.message);
      updates.push({
        filter: { _id: reminder._id },
        update: { $set: { status: "sent", sentAt: new Date(), lastError: null } },
      });
      logger.info("appointment reminder sent", {
        organizationId,
        appointmentId: reminder.appointmentId,
      });
      sent += 1;
    } catch (err) {
      const attempts = reminder.attempts + 1;
      const lastError = err instanceof Error ? err.message : String(err);
      updates.push({
        filter: { _id: reminder._id },
        update: {
          $set: {
            attempts,
            lastError,
            status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
          },
        },
      });
      logger.warn("appointment reminder send failed", {
        organizationId,
        appointmentId: reminder.appointmentId,
        attempts,
      });
      failed += 1;
    }
  }

  if (updates.length) {
    await db.collection(REMINDERS_COLLECTION).bulkWrite(
      updates.map((u) => ({
        updateOne: { filter: u.filter, update: u.update },
      })),
      { ordered: false }
    );
  }

  return { sent, failed, pending: queued.length - sent - failed };
}
