import type { Db } from "mongodb";
import { KOLKATA_OFFSET, now as nowFn } from "@/clinic/core/datetime";
import { logger } from "@/lib/logger";
import {
  APP_BASE_URL,
  CRONLITE_TIMEZONE,
  createCronLiteJob,
  deleteCronLiteJob,
} from "@/services/cronlite/cronlite.service";

/**
 * Per-appointment reminder scheduling via CronLite.
 *
 * Instead of relying solely on the every-minute poll, each appointment gets its
 * own one-shot CronLite job that fires exactly at (appointment − 1h) and hits
 * POST /api/cron/appointment-reminder. The per-minute poll remains as a
 * safety-net fallback for jobs that were missed or created with no future
 * reminder window. The CronLite job deletes itself after firing (handled in
 * the webhook) so it never re-fires on a later matching date.
 */

const COLLECTION = "clc_appointments";
const REMINDER_LEAD_MS = 60 * 60 * 1000;
/** Don't bother scheduling a job less than this far out — the poll covers it. */
const MIN_LEAD_MS = 2 * 60 * 1000;

function appointmentReminderUrl(clinicId: string, appointmentId: string): string {
  return `${APP_BASE_URL}/api/cron/appointment-reminder?clinicId=${encodeURIComponent(
    clinicId
  )}&appointmentId=${encodeURIComponent(appointmentId)}`;
}

/** Builds a 5-field cron expression for a specific instant in the given timezone. */
export function cronForInstant(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    minute: "2-digit",
    hour: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const minute = get("minute");
  const hour = get("hour");
  const day = get("day");
  const month = get("month");
  return `${minute} ${hour} ${day} ${month} *`;
}

function reminderInstant(date: string, time: string): Date {
  const at = new Date(`${date}T${time}:00${KOLKATA_OFFSET}`);
  return new Date(at.getTime() - REMINDER_LEAD_MS);
}

async function getCronLiteJobId(
  db: Db,
  clinicId: string,
  appointmentId: string
): Promise<string | null> {
  const doc = await db
    .collection<{ cronliteJobId?: string | null }>(COLLECTION)
    .findOne({ clinicId, appointmentId }, { projection: { cronliteJobId: 1 } });
  return doc?.cronliteJobId ?? null;
}

async function setCronLiteJobId(
  db: Db,
  clinicId: string,
  appointmentId: string,
  jobId: string | null
): Promise<void> {
  await db
    .collection(COLLECTION)
    .updateOne({ clinicId, appointmentId }, { $set: { cronliteJobId: jobId } });
}

/** Schedules (or reschedules) the 1-hour reminder job for an appointment. */
export async function scheduleAppointmentReminder(
  db: Db,
  clinicId: string,
  appointmentId: string,
  date: string,
  time: string,
  status: string
): Promise<string | null> {
  if (status === "cancelled" || status === "completed" || status === "no_show") return null;

  // Idempotent: don't create a second CronLite job if one is already tracked
  // for this appointment. reschedule/cancel manage transitions of this id, so
  // a repeated create (e.g. a redelivered event) must be a no-op.
  const tracked = await getCronLiteJobId(db, clinicId, appointmentId);
  if (tracked) {
    logger.info("appointment reminder already scheduled", {
      clinicId,
      appointmentId,
      jobId: tracked,
    });
    return tracked;
  }

  const when = reminderInstant(date, time);
  if (when.getTime() <= nowFn().getTime() + MIN_LEAD_MS) {
    // Reminder window is in the past (or too close) — the every-minute poll
    // handles any still-pending reminder rows. Nothing to schedule.
    return null;
  }

  const job = await createCronLiteJob({
    name: `appt-reminder-${clinicId}-${appointmentId}`,
    cronExpression: cronForInstant(when, CRONLITE_TIMEZONE),
    timezone: CRONLITE_TIMEZONE,
    webhookUrl: appointmentReminderUrl(clinicId, appointmentId),
  });
  await setCronLiteJobId(db, clinicId, appointmentId, job.id);
  logger.info("scheduled appointment reminder job", {
    clinicId,
    appointmentId,
    jobId: job.id,
    firesAt: when.toISOString(),
  });
  return job.id;
}

/** Cancels the CronLite reminder job for an appointment (and clears the id). */
export async function cancelAppointmentReminder(
  db: Db,
  clinicId: string,
  appointmentId: string
): Promise<void> {
  const jobId = await getCronLiteJobId(db, clinicId, appointmentId);
  if (!jobId) return;
  try {
    await deleteCronLiteJob(jobId);
  } catch (error) {
    logger.warn("failed to delete cronlite appointment job", {
      clinicId,
      appointmentId,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  await setCronLiteJobId(db, clinicId, appointmentId, null);
}

/** Reschedules the reminder job after an appointment's time/status changed. */
export async function rescheduleAppointmentReminder(
  db: Db,
  clinicId: string,
  appointmentId: string,
  date: string,
  time: string,
  status: string
): Promise<string | null> {
  await cancelAppointmentReminder(db, clinicId, appointmentId);
  return scheduleAppointmentReminder(db, clinicId, appointmentId, date, time, status);
}

/** Webhook-side cleanup: delete the one-shot job once it has fired. */
export async function deleteFiredAppointmentJob(
  db: Db,
  clinicId: string,
  appointmentId: string
): Promise<void> {
  await cancelAppointmentReminder(db, clinicId, appointmentId);
}
