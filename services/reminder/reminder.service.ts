import type { Client } from "whatsapp-web.js";
import type { Db } from "mongodb";
import { logger } from "@/lib/logger";
import { todayDateString } from "@/lib/stats";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { toWhatsAppRemoteId } from "@/lib/phone";
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

/** Appointments whose slot is inside the reminder window and not yet reminded. */
export async function findDueAppointments(db: Db, now: Date): Promise<DueAppointment[]> {
  const today = todayDateString();
  const docs = await db
    .collection("appointments")
    .find({
      date: today,
      status: { $in: ["confirmed", "pending"] },
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
  await db
    .collection(REMINDERS_COLLECTION)
    .createIndex({ appointmentId: 1 }, { unique: true });
  let queued = 0;
  let skipped = 0;
  for (const appt of due) {
    const remoteId = toWhatsAppRemoteId(appt.whatsapp) ?? toWhatsAppRemoteId(appt.phone);
    const exists = await db.collection(REMINDERS_COLLECTION).findOne({
      appointmentId: appt.appointmentId,
    });
    if (exists) {
      skipped += 1;
      continue;
    }
    const doc: ReminderDoc = {
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
    };
    try {
      await db.collection(REMINDERS_COLLECTION).insertOne(doc);
      queued += 1;
    } catch (err) {
      // Duplicate key on appointmentId — already queued.
      if (err instanceof Error && /duplicate key/i.test(err.message)) {
        skipped += 1;
      } else {
        throw err;
      }
    }
  }
  return { queued, skipped };
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
  for (const reminder of queued) {
    if (!reminder.remoteId) {
      await db.collection(REMINDERS_COLLECTION).updateOne(
        { _id: reminder._id },
        { $set: { status: "failed", attempts: reminder.attempts + 1 } }
      );
      failed += 1;
      continue;
    }
    try {
      await client.sendMessage(reminder.remoteId, reminder.message);
      await db.collection(REMINDERS_COLLECTION).updateOne(
        { _id: reminder._id },
        { $set: { status: "sent", sentAt: new Date(), lastError: null } }
      );
      logger.info("appointment reminder sent", {
        organizationId,
        appointmentId: reminder.appointmentId,
      });
      sent += 1;
    } catch (err) {
      const attempts = reminder.attempts + 1;
      const lastError = err instanceof Error ? err.message : String(err);
      await db.collection(REMINDERS_COLLECTION).updateOne(
        { _id: reminder._id },
        {
          $set: {
            attempts,
            lastError,
            status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
          },
        }
      );
      logger.warn("appointment reminder send failed", {
        organizationId,
        appointmentId: reminder.appointmentId,
        attempts,
      });
      failed += 1;
    }
  }
  return { sent, failed, pending: queued.length - sent - failed };
}
