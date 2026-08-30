import type { Db, WithId } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";
import { NotFoundError } from "@/clinic/core/errors";
import type { ClinicContext } from "@/clinic/core/context";
import type {
  AppointmentDoc,
  AppointmentQueueStatus,
  AppointmentSession,
} from "@/clinic/modules/appointments/appointments.schema";

export type QueueChannel = "whatsapp" | "sms" | "push" | "in_app";

export const QUEUE_STAGES = [
  "you_are_next",
  "please_be_ready",
  "token_called",
  "proceed_to_room",
] as const;

export type QueueStage = (typeof QUEUE_STAGES)[number];

export interface QueueSettings {
  clinicId: string;
  enabledStages: QueueStage[];
  channel: QueueChannel;
  templateOverrides?: Partial<Record<QueueStage, string>>;
}

export interface QueueEnriched {
  appointment: WithId<AppointmentDoc>;
  patientName: string;
  patientPhone: string | null;
  doctorName: string;
}

export interface QueueSnapshot {
  date: string;
  doctorId: string | null;
  current: QueueEnriched | null;
  next: QueueEnriched | null;
  waiting: QueueEnriched[];
  completed: QueueEnriched[];
  upcoming: QueueEnriched[];
  counts: {
    waiting: number;
    called: number;
    inConsultation: number;
    completed: number;
    upcoming: number;
    priority: number;
  };
}

const QUEUE_SETTINGS_COLLECTION = "clc_queue_settings";

const DEFAULT_TEMPLATES: Record<QueueStage, string> = {
  you_are_next:
    "Hi {name}, you are next in the queue (Token #{token}) for {doctor}. Please be ready.",
  please_be_ready:
    "Hi {name}, please be ready — you will be called shortly (Token #{token}).",
  token_called:
    "Hi {name}, your token #{token} with {doctor} has been called. Please proceed to the consultation room.",
  proceed_to_room:
    "Hi {name}, please proceed to the consultation room now (Token #{token}).",
};

export function deriveSession(time: string): AppointmentSession {
  const hour = Number(time.split(":")[0] ?? "0");
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function lifecycleStatusFor(queueStatus: AppointmentQueueStatus): AppointmentDoc["status"] {
  switch (queueStatus) {
    case "completed":
      return "completed";
    case "no_show":
      return "no_show";
    case "cancelled":
      return "cancelled";
    case "rescheduled":
      return "rescheduled";
    default:
      return "scheduled";
  }
}

async function getPatient(
  db: Db,
  clinicId: string,
  patientId: string
): Promise<{ fullName: string; mobile: string; whatsapp: string | null } | null> {
  const doc = await db
    .collection<{ fullName: string; mobile: string; whatsapp: string | null }>(
      CLINIC_COLLECTIONS.patients
    )
    .findOne({ clinicId, patientId }, { projection: { fullName: 1, mobile: 1, whatsapp: 1 } });
  return doc;
}

async function getDoctor(
  db: Db,
  clinicId: string,
  doctorId: string
): Promise<{ fullName: string } | null> {
  const doc = await db
    .collection<{ fullName: string }>(CLINIC_COLLECTIONS.doctors)
    .findOne({ clinicId, doctorId }, { projection: { fullName: 1 } });
  return doc;
}

async function enrich(
  db: Db,
  clinicId: string,
  appointment: WithId<AppointmentDoc>
): Promise<QueueEnriched> {
  const patient = await getPatient(db, clinicId, appointment.patientId);
  const doctor = await getDoctor(db, clinicId, appointment.doctorId);
  return {
    appointment,
    patientName: patient?.fullName ?? appointment.patientId,
    patientPhone: patient?.whatsapp ?? patient?.mobile ?? null,
    doctorName: doctor?.fullName ?? appointment.doctorId,
  };
}

async function getQueueSettings(db: Db, clinicId: string): Promise<QueueSettings> {
  const doc = await db
    .collection<QueueSettings>(QUEUE_SETTINGS_COLLECTION)
    .findOne({ clinicId });
  if (!doc) {
    return {
      clinicId,
      enabledStages: ["you_are_next", "please_be_ready", "token_called", "proceed_to_room"],
      channel: "whatsapp",
      templateOverrides: {},
    };
  }
  return {
    clinicId,
    enabledStages: doc.enabledStages ?? ["you_are_next", "token_called", "proceed_to_room"],
    channel: doc.channel ?? "whatsapp",
    templateOverrides: doc.templateOverrides ?? {},
  };
}

export async function saveQueueSettings(
  db: Db,
  clinicId: string,
  input: { enabledStages?: QueueStage[]; channel?: QueueChannel; templateOverrides?: Partial<Record<QueueStage, string>> }
): Promise<QueueSettings> {
  const current = await getQueueSettings(db, clinicId);
  const next: QueueSettings = {
    clinicId,
    enabledStages: input.enabledStages ?? current.enabledStages,
    channel: input.channel ?? current.channel,
    templateOverrides: { ...current.templateOverrides, ...(input.templateOverrides ?? {}) },
  };
  await db
    .collection<QueueSettings>(QUEUE_SETTINGS_COLLECTION)
    .updateOne({ clinicId }, { $set: next }, { upsert: true });
  return next;
}

export async function generateTokenNumber(
  db: Db,
  clinicId: string,
  doctorId: string,
  date: string,
  session: AppointmentSession
): Promise<number> {
  const last = await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .find({
      clinicId,
      doctorId,
      date,
      session,
      queueStatus: { $in: ["checked_in", "waiting", "called", "in_consultation", "skipped"] },
    })
    .sort({ tokenNumber: -1 })
    .limit(1)
    .toArray();
  return (last[0]?.tokenNumber ?? 0) + 1;
}

function eligibleFilter(clinicId: string, doctorId: string | null, date: string) {
  const filter: Record<string, unknown> = {
    clinicId,
    date,
    queueStatus: { $in: ["waiting", "skipped"] },
  };
  if (doctorId) filter.doctorId = doctorId;
  return filter;
}

async function getEligible(
  db: Db,
  clinicId: string,
  doctorId: string | null,
  date: string,
  limit?: number
): Promise<WithId<AppointmentDoc>[]> {
  const cursor = db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .find(eligibleFilter(clinicId, doctorId, date))
    .sort({ priority: -1, tokenNumber: 1 });
  if (limit) cursor.limit(limit);
  return cursor.toArray();
}

/** Assigns a token (if absent) and moves the appointment into the waiting pool. */
export async function checkIn(
  db: Db,
  clinicId: string,
  appointmentId: string,
  ctx: ClinicContext,
  priority = false
): Promise<WithId<AppointmentDoc>> {
  const doc = await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .findOne({ clinicId, appointmentId });
  if (!doc) throw new NotFoundError("Appointment not found");

  const session = doc.session ?? deriveSession(doc.time);
  const tokenNumber = doc.tokenNumber ?? (await generateTokenNumber(db, clinicId, doc.doctorId, doc.date, session));

  const set: Record<string, unknown> = {
    queueStatus: "waiting",
    tokenNumber,
    session,
    priority: priority || doc.priority || false,
    checkedInAt: doc.checkedInAt ?? nowFn(),
    status: "scheduled",
    notifiedStages: [],
  };
  await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .updateOne(
      { clinicId, appointmentId },
      {
        $set: set,
        $push: { queueHistory: { status: "checked_in", at: nowFn(), by: ctx.userId } as never },
      } as never
    );
  return (await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .findOne({ clinicId, appointmentId })) as WithId<AppointmentDoc>;
}

async function applyTransition(
  db: Db,
  clinicId: string,
  appointmentId: string,
  to: AppointmentQueueStatus,
  ctx: ClinicContext
): Promise<WithId<AppointmentDoc>> {
  const doc = await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .findOne({ clinicId, appointmentId });
  if (!doc) throw new NotFoundError("Appointment not found");

  const set: Record<string, unknown> = {
    queueStatus: to,
    status: lifecycleStatusFor(to),
  };
  if (to === "called") set.calledAt = nowFn();
  if (to === "completed") set.completedAt = nowFn();
  // Re-entering the waiting pool resets per-cycle notification tracking.
  if (to === "waiting" || to === "checked_in") set.notifiedStages = [];

  await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .updateOne(
      { clinicId, appointmentId },
      {
        $set: set,
        $push: { queueHistory: { status: to, at: nowFn(), by: ctx.userId } as never },
      } as never
    );

  return (await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .findOne({ clinicId, appointmentId })) as WithId<AppointmentDoc>;
}

function renderTemplate(
  template: string,
  vars: { name: string; token: string; doctor: string }
): string {
  return template
    .replace(/\{name\}/g, vars.name)
    .replace(/\{token\}/g, vars.token)
    .replace(/\{doctor\}/g, vars.doctor);
}

async function recordQueueNotification(
  db: Db,
  clinicId: string,
  patientId: string,
  appointmentId: string,
  stage: QueueStage,
  channel: QueueChannel,
  message: string,
  phone: string | null,
  status: "pending" | "enqueued" | "sent" | "failed"
): Promise<void> {
  const now = nowFn();
  await db.collection("clc_appointment_notifications").insertOne({
    clinicId,
    appointmentId,
    recipientRole: "patient",
    recipientId: patientId,
    type: "queue",
    action: "queue",
    stage,
    channel,
    status,
    phone: phone ?? undefined,
    message,
    scheduledTime: now,
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    processedAt: null,
  } as never);
}

/**
 * Sends a staged queue notification to the patient, honouring the clinic's
 * enabled-stage configuration and de-duplicating per cycle via notifiedStages.
 */
export async function notifyPatient(
  db: Db,
  clinicId: string,
  appointment: WithId<AppointmentDoc>,
  stage: QueueStage,
  ctx: ClinicContext
): Promise<{ notified: boolean; reason?: string }> {
  const settings = await getQueueSettings(db, clinicId);
  if (!settings.enabledStages.includes(stage)) {
    return { notified: false, reason: "disabled" };
  }
  if ((appointment.notifiedStages ?? []).includes(stage)) {
    return { notified: false, reason: "dedup" };
  }

  const patient = await getPatient(db, clinicId, appointment.patientId);
  const doctor = await getDoctor(db, clinicId, appointment.doctorId);
  const phone = patient?.whatsapp ?? patient?.mobile ?? null;
  if (!phone) return { notified: false, reason: "nophone" };

  const template = settings.templateOverrides?.[stage] ?? DEFAULT_TEMPLATES[stage];
  const message = renderTemplate(template, {
    name: patient?.fullName?.split(" ")[0] ?? "there",
    token: String(appointment.tokenNumber ?? "?"),
    doctor: doctor?.fullName ?? "",
  });

  let status: "pending" | "enqueued" = "enqueued";
  if (settings.channel === "whatsapp") {
    await enqueueClinicNotification(db, phone, message, "queue_alert", undefined, clinicId);
  } else {
    // No SMS / push / in-app integration wired yet — record the intent for history.
    status = "pending";
  }

  await recordQueueNotification(
    db,
    clinicId,
    appointment.patientId,
    appointment.appointmentId,
    stage,
    settings.channel,
    message,
    phone,
    status
  );

  await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .updateOne(
      { clinicId, appointmentId: appointment.appointmentId },
      { $addToSet: { notifiedStages: stage } } as never
    );

  return { notified: true };
}

/**
 * After a patient leaves the eligible pool, identifies the next eligible token
 * and (if configured) alerts them that they are next, plus the following
 * patient that they should be ready.
 */
export async function advanceAndNotify(
  db: Db,
  clinicId: string,
  doctorId: string | null,
  date: string,
  ctx: ClinicContext
): Promise<{ notified: string | null }> {
  const eligible = await getEligible(db, clinicId, doctorId, date, 2);
  if (eligible[0]) await notifyPatient(db, clinicId, eligible[0], "you_are_next", ctx);
  if (eligible[1]) await notifyPatient(db, clinicId, eligible[1], "please_be_ready", ctx);
  return { notified: eligible[0]?.appointmentId ?? null };
}

export async function callNext(
  db: Db,
  clinicId: string,
  doctorId: string | null,
  date: string,
  ctx: ClinicContext
): Promise<{ appointmentId: string | null }> {
  const eligible = await getEligible(db, clinicId, doctorId, date, 1);
  if (!eligible[0]) return { appointmentId: null };
  const updated = await applyTransition(db, clinicId, eligible[0].appointmentId, "called", ctx);
  await notifyPatient(db, clinicId, updated, "token_called", ctx);
  return { appointmentId: updated.appointmentId };
}

export async function startConsultation(
  db: Db,
  clinicId: string,
  appointmentId: string,
  ctx: ClinicContext
): Promise<WithId<AppointmentDoc>> {
  const updated = await applyTransition(db, clinicId, appointmentId, "in_consultation", ctx);
  await notifyPatient(db, clinicId, updated, "proceed_to_room", ctx);
  return updated;
}

export async function skip(
  db: Db,
  clinicId: string,
  appointmentId: string,
  ctx: ClinicContext
): Promise<WithId<AppointmentDoc>> {
  const updated = await applyTransition(db, clinicId, appointmentId, "skipped", ctx);
  await advanceAndNotify(db, clinicId, updated.doctorId, updated.date, ctx);
  return updated;
}

export async function recall(
  db: Db,
  clinicId: string,
  appointmentId: string,
  ctx: ClinicContext
): Promise<WithId<AppointmentDoc>> {
  return applyTransition(db, clinicId, appointmentId, "waiting", ctx);
}

export async function complete(
  db: Db,
  clinicId: string,
  appointmentId: string,
  ctx: ClinicContext
): Promise<WithId<AppointmentDoc>> {
  const updated = await applyTransition(db, clinicId, appointmentId, "completed", ctx);
  await advanceAndNotify(db, clinicId, updated.doctorId, updated.date, ctx);
  return updated;
}

export async function markNoShow(
  db: Db,
  clinicId: string,
  appointmentId: string,
  ctx: ClinicContext
): Promise<WithId<AppointmentDoc>> {
  const updated = await applyTransition(db, clinicId, appointmentId, "no_show", ctx);
  await advanceAndNotify(db, clinicId, updated.doctorId, updated.date, ctx);
  return updated;
}

export async function cancelQueue(
  db: Db,
  clinicId: string,
  appointmentId: string,
  ctx: ClinicContext
): Promise<WithId<AppointmentDoc>> {
  const updated = await applyTransition(db, clinicId, appointmentId, "cancelled", ctx);
  await advanceAndNotify(db, clinicId, updated.doctorId, updated.date, ctx);
  return updated;
}

export async function rescheduleQueue(
  db: Db,
  clinicId: string,
  appointmentId: string,
  ctx: ClinicContext,
  date: string,
  time: string
): Promise<WithId<AppointmentDoc>> {
  const updated = await applyTransition(db, clinicId, appointmentId, "rescheduled", ctx);
  await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .updateOne({ clinicId, appointmentId }, { $set: { date, time, tokenNumber: null, session: null } } as never);
  await advanceAndNotify(db, clinicId, updated.doctorId, updated.date, ctx);
  const resumed = await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .findOne({ clinicId, appointmentId });
  return resumed as WithId<AppointmentDoc>;
}

export async function getQueueSnapshot(
  db: Db,
  clinicId: string,
  doctorId: string | null,
  date: string
): Promise<QueueSnapshot> {
  const filter: Record<string, unknown> = { clinicId, date };
  if (doctorId) filter.doctorId = doctorId;

  const all = await db
    .collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments)
    .find(filter)
    .toArray();

  const inConsultation = all
    .filter((a) => a.queueStatus === "in_consultation")
    .sort((a, b) => (a.calledAt?.getTime() ?? 0) - (b.calledAt?.getTime() ?? 0));
  const called = all
    .filter((a) => a.queueStatus === "called")
    .sort((a, b) => (a.calledAt?.getTime() ?? 0) - (b.calledAt?.getTime() ?? 0));
  const current = inConsultation[0] ?? called[0] ?? null;

  const eligible = all
    .filter((a) => a.queueStatus === "waiting" || a.queueStatus === "skipped")
    .sort((a, b) => {
      if ((b.priority ? 1 : 0) !== (a.priority ? 1 : 0)) {
        return (b.priority ? 1 : 0) - (a.priority ? 1 : 0);
      }
      return (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0);
    });

  const completed = all
    .filter((a) => a.queueStatus === "completed")
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

  const upcoming = all
    .filter((a) => !a.queueStatus || a.queueStatus === "scheduled")
    .sort((a, b) => a.time.localeCompare(b.time));

  const next = eligible[0] ?? null;

  const [currentE, nextE, waitingE, completedE, upcomingE] = await Promise.all([
    current ? enrich(db, clinicId, current) : Promise.resolve(null),
    next ? enrich(db, clinicId, next) : Promise.resolve(null),
    Promise.all(eligible.map((a) => enrich(db, clinicId, a))),
    Promise.all(completed.map((a) => enrich(db, clinicId, a))),
    Promise.all(upcoming.map((a) => enrich(db, clinicId, a))),
  ]);

  return {
    date,
    doctorId,
    current: currentE,
    next: nextE,
    waiting: waitingE,
    completed: completedE,
    upcoming: upcomingE,
    counts: {
      waiting: eligible.length,
      called: called.length,
      inConsultation: inConsultation.length,
      completed: completed.length,
      upcoming: upcoming.length,
      priority: eligible.filter((a) => a.priority).length,
    },
  };
}

export { getQueueSettings };
