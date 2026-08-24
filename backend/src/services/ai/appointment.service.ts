import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, ObjectId } from "mongodb";
import { DB_COLLECTIONS } from "@/lib/constants";
import type {
  AppointmentStatus,
  BookingSource,
} from "@/lib/ai-types";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";
import {
  isISODate,
  isPastDate,
  isValidTime,
  timeInRange,
} from "@/services/ai/dates";
import { logger } from "@/lib/logger";

export type AppointmentErrorCode =
  | "INVALID_DOCTOR"
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "SLOT_TAKEN"
  | "NOT_FOUND"
  | "FAILED";

export interface AppointmentInput {
  organizationId: string;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  date: string;
  time: string;
  conversationId?: string;
  customerId?: string;
  notes?: string;
}

export interface RescheduleInput {
  organizationId: string;
  customerPhone: string;
  doctorName?: string;
  oldDate?: string;
  newDate: string;
  newTime: string;
  conversationId?: string;
}

export interface CancelInput {
  organizationId: string;
  customerPhone: string;
  doctorName?: string;
  date?: string;
  time?: string;
}

export interface StoredAppointment {
  id: string;
  fullName: string;
  mobile: string;
  doctorId: string;
  doctorName: string | null;
  department: string | null;
  date: string;
  time: string;
  type: "in-person" | "video";
  status: AppointmentStatus;
  bookingSource: BookingSource;
  notes: string | null;
  whatsappConversationId: string | null;
  whatsappCustomerId: string | null;
  createdAt: string;
}

interface DoctorDoc {
  _id: ObjectId;
  name: string;
  department?: string | null;
}

interface AppointmentDoc extends Omit<StoredAppointment, "id" | "createdAt"> {
  _id: ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  reason?: string | null;
}

export type AppointmentResult =
  | { ok: true; appointment: StoredAppointment }
  | { ok: false; code: AppointmentErrorCode; message: string };

function normalizeDoctorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr\.?|doctor)\s+/i, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toAppointment(doc: AppointmentDoc): StoredAppointment {
  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    mobile: doc.mobile,
    doctorId: doc.doctorId,
    doctorName: doc.doctorName ?? null,
    department: doc.department ?? null,
    date: doc.date,
    time: doc.time,
    type: doc.type,
    status: doc.status,
    bookingSource: doc.bookingSource ?? "manual",
    notes: doc.notes ?? null,
    whatsappConversationId: doc.whatsappConversationId ?? null,
    whatsappCustomerId: doc.whatsappCustomerId ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Resolves a doctor by name within the clinic. Only real doctor users are
 * returned — the AI can never invent a doctor.
 */
export async function resolveDoctor(
  db: Db,
  organizationId: string,
  doctorName: string
): Promise<{ id: string; name: string; department: string | null } | null> {
  const query = normalizeDoctorName(doctorName);
  if (!query) return null;

  const doctors = await db
    .collection<DoctorDoc>(DB_COLLECTIONS.users)
    .find({ role: "doctor" })
    .toArray();

  const normalized = doctors.map((d) => ({
    doc: d,
    key: normalizeDoctorName(d.name),
  }));

  const exact = normalized.find((n) => n.key === query);
  const chosen = exact ?? normalized.find((n) => {
    const a = n.key;
    const b = query;
    return (
      a.length >= 3 &&
      b.length >= 3 &&
      (a.includes(b) || b.includes(a))
    );
  });

  if (!chosen) return null;
  return {
    id: chosen.doc._id.toString(),
    name: chosen.doc.name,
    department: chosen.doc.department ?? null,
  };
}

interface ValidationResult {
  ok: boolean;
  code?: AppointmentErrorCode;
  message?: string;
}

/**
 * Validates the slot against clinic working hours and date rules.
 */
function validateSlot(
  date: string,
  time: string,
  org: OrganizationRecord
): ValidationResult {
  if (!isISODate(date)) {
    return {
      ok: false,
      code: "INVALID_DATE",
      message: "The date format is invalid.",
    };
  }
  if (isPastDate(date)) {
    return {
      ok: false,
      code: "INVALID_DATE",
      message: "The requested date is in the past.",
    };
  }
  if (!isValidTime(time)) {
    return {
      ok: false,
      code: "INVALID_TIME",
      message: "The time format is invalid.",
    };
  }
  if (!timeInRange(time, org.settings.open, org.settings.close)) {
    return {
      ok: false,
      code: "INVALID_TIME",
      message: `The clinic is open from ${org.settings.open} to ${org.settings.close}.`,
    };
  }
  return { ok: true };
}

/**
 * Checks whether a slot is already occupied for the same doctor at the same
 * date and time (duplicate protection). Cancelled/no-show appointments free
 * the slot.
 */
export async function isSlotOccupied(
  db: Db,
  organizationId: string,
  doctorId: string,
  date: string,
  time: string
): Promise<boolean> {
  const doc = await db.collection(DB_COLLECTIONS.appointments).findOne({
    doctorId,
    date,
    time,
    status: { $nin: ["cancelled", "no_show"] },
    $or: [{ organizationId }, { organizationId: { $exists: false } }],
  });
  return Boolean(doc);
}

export async function checkAvailability(
  db: Db,
  organizationId: string,
  org: OrganizationRecord,
  doctorName: string,
  date: string,
  time: string
): Promise<
  | { ok: true; available: boolean; doctor: { id: string; name: string; department: string | null } }
  | { ok: false; code: AppointmentErrorCode; message: string }
> {
  const doctor = await resolveDoctor(db, organizationId, doctorName);
  if (!doctor) {
    return {
      ok: false,
      code: "INVALID_DOCTOR",
      message: `We could not find a doctor named "${doctorName}".`,
    };
  }

  const slot = validateSlot(date, time, org);
  if (!slot.ok) {
    return { ok: false, code: slot.code!, message: slot.message! };
  }

  const occupied = await isSlotOccupied(db, organizationId, doctor.id, date, time);
  return { ok: true, available: !occupied, doctor };
}

/**
 * Creates an appointment through the backend. This is the ONLY path the AI
 * can use to persist an appointment. Nothing is created without validation,
 * and a duplicate/occupied slot is never created twice.
 */
export async function createAppointment(
  db: Db,
  org: OrganizationRecord,
  input: AppointmentInput
): Promise<AppointmentResult> {
  const checked = await checkAvailability(
    db,
    input.organizationId,
    org,
    input.doctorName,
    input.date,
    input.time
  );

  if (!checked.ok) return checked;
  if (!checked.available) {
    return {
      ok: false,
      code: "SLOT_TAKEN",
      message: "That time slot is already booked. Please try another time.",
    };
  }

  const now = nowFn();
  const result = await db.collection(DB_COLLECTIONS.appointments).insertOne({
    organizationId: input.organizationId,
    fullName: input.patientName,
    mobile: input.phoneNumber,
    doctorId: checked.doctor.id,
    doctorName: checked.doctor.name,
    department: checked.doctor.department ?? null,
    date: input.date,
    time: input.time,
    type: "in-person",
    status: "confirmed",
    bookingSource: "whatsapp_ai",
    notes: input.notes ?? null,
    whatsappConversationId: input.conversationId ?? null,
    whatsappCustomerId: input.customerId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("appointment created via whatsapp ai", {
    organizationId: input.organizationId,
    appointmentId: result.insertedId.toString(),
  });

  return {
    ok: true,
    appointment: {
      id: result.insertedId.toString(),
      fullName: input.patientName,
      mobile: input.phoneNumber,
      doctorId: checked.doctor.id,
      doctorName: checked.doctor.name,
      department: checked.doctor.department ?? null,
      date: input.date,
      time: input.time,
      type: "in-person",
      status: "confirmed",
      bookingSource: "whatsapp_ai",
      notes: input.notes ?? null,
      whatsappConversationId: input.conversationId ?? null,
      whatsappCustomerId: input.customerId ?? null,
      createdAt: now.toISOString(),
    },
  };
}

function findCustomerAppointmentFilter(input: {
  organizationId: string;
  customerPhone: string;
  doctorName?: string;
  date?: string;
  time?: string;
}) {
  const filter: Record<string, unknown> = {
    mobile: input.customerPhone,
    status: { $nin: ["cancelled", "no_show"] },
    $or: [{ organizationId: input.organizationId }, { organizationId: { $exists: false } }],
  };
  if (input.date) filter.date = input.date;
  if (input.time) filter.time = input.time;
  return filter;
}

/**
 * Reschedules the customer's matching future appointment. The new slot must be
 * validated and free, otherwise nothing changes.
 */
export async function rescheduleAppointment(
  db: Db,
  org: OrganizationRecord,
  input: RescheduleInput
): Promise<AppointmentResult> {
  const slot = validateSlot(input.newDate, input.newTime, org);
  if (!slot.ok) {
    return { ok: false, code: slot.code!, message: slot.message! };
  }

  const filter = findCustomerAppointmentFilter({
    organizationId: input.organizationId,
    customerPhone: input.customerPhone,
    doctorName: input.doctorName,
    date: input.oldDate,
  });

  const existing = await db
    .collection<AppointmentDoc>(DB_COLLECTIONS.appointments)
    .findOne(filter);
  if (!existing) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "We could not find the appointment you want to change.",
    };
  }

  const doctorId = existing.doctorId;
  if (await isSlotOccupied(db, input.organizationId, doctorId, input.newDate, input.newTime)) {
    return {
      ok: false,
      code: "SLOT_TAKEN",
      message: "That new time slot is already booked. Please try another time.",
    };
  }

  await db.collection(DB_COLLECTIONS.appointments).updateOne(
    { _id: existing._id },
    {
      $set: {
        date: input.newDate,
        time: input.newTime,
        status: "rescheduled",
        updatedAt: nowFn(),
        ...(input.conversationId ? { whatsappConversationId: input.conversationId } : {}),
      },
    }
  );

  logger.info("appointment rescheduled via whatsapp ai", {
    organizationId: input.organizationId,
    appointmentId: existing._id.toString(),
  });

  const updated = await db
    .collection<AppointmentDoc>(DB_COLLECTIONS.appointments)
    .findOne({ _id: existing._id });
  return { ok: true, appointment: toAppointment(updated as AppointmentDoc) };
}

/**
 * Cancels the customer's matching appointment.
 */
export async function cancelAppointment(
  db: Db,
  organizationId: string,
  input: CancelInput
): Promise<AppointmentResult> {
  const filter = findCustomerAppointmentFilter({
    organizationId,
    customerPhone: input.customerPhone,
    doctorName: input.doctorName,
    date: input.date,
    time: input.time,
  });

  const existing = await db
    .collection<AppointmentDoc>(DB_COLLECTIONS.appointments)
    .findOne(filter);
  if (!existing) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "We could not find the appointment you want to cancel.",
    };
  }

  await db.collection(DB_COLLECTIONS.appointments).updateOne(
    { _id: existing._id },
    { $set: { status: "cancelled", updatedAt: nowFn() } }
  );

  logger.info("appointment cancelled via whatsapp ai", {
    organizationId,
    appointmentId: existing._id.toString(),
  });

  const updated = await db
    .collection<AppointmentDoc>(DB_COLLECTIONS.appointments)
    .findOne({ _id: existing._id });
  return { ok: true, appointment: toAppointment(updated as AppointmentDoc) };
}

/**
 * Retrieves the customer's appointment status list.
 */
export async function getCustomerAppointments(
  db: Db,
  organizationId: string,
  customerPhone: string
): Promise<StoredAppointment[]> {
  const docs = await db
    .collection<AppointmentDoc>(DB_COLLECTIONS.appointments)
    .find({
      mobile: customerPhone,
      $or: [{ organizationId }, { organizationId: { $exists: false } }],
    })
    .sort({ date: -1, time: -1 })
    .toArray();
  return docs.map(toAppointment);
}
