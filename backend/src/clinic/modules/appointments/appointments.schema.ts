import type { ClinicDocument } from "@/clinic/core/repository";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;

export interface AppointmentDoc extends ClinicDocument {
  clinicId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: (typeof APPOINTMENT_STATUSES)[number];
  reason: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  /** Token / queue execution state (Token Management methodology). Null when not yet in the queue. */
  queueStatus?: AppointmentQueueStatus | null;
  tokenNumber?: number | null;
  session?: AppointmentSession | null;
  priority?: boolean | null;
  checkedInAt?: Date | null;
  calledAt?: Date | null;
  completedAt?: Date | null;
  /** Per-stage notification tracking to prevent duplicate alerts within a queue cycle. */
  notifiedStages?: string[] | null;
  queueHistory?: AppointmentQueueEvent[] | null;
}

export const APPOINTMENT_QUEUE_STATUSES = [
  "scheduled",
  "checked_in",
  "waiting",
  "called",
  "in_consultation",
  "completed",
  "cancelled",
  "no_show",
  "skipped",
  "rescheduled",
] as const;

export type AppointmentQueueStatus = (typeof APPOINTMENT_QUEUE_STATUSES)[number];

export const APPOINTMENT_QUEUE_SESSIONS = [
  "morning",
  "afternoon",
  "evening",
] as const;

export type AppointmentSession = (typeof APPOINTMENT_QUEUE_SESSIONS)[number];

export interface AppointmentQueueEvent {
  status: AppointmentQueueStatus;
  at: Date;
  by?: string | null;
}

export function appointmentToPublic(doc: AppointmentDoc) {
  return {
    appointmentId: doc.appointmentId,
    patientId: doc.patientId,
    doctorId: doc.doctorId,
    date: doc.date,
    time: doc.time,
    status: doc.status,
    reason: doc.reason,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    queueStatus: doc.queueStatus ?? null,
    tokenNumber: doc.tokenNumber ?? null,
    session: doc.session ?? null,
    priority: doc.priority ?? false,
    checkedInAt: doc.checkedInAt ?? null,
    calledAt: doc.calledAt ?? null,
    completedAt: doc.completedAt ?? null,
    notifiedStages: doc.notifiedStages ?? [],
    queueHistory: doc.queueHistory ?? [],
  };
}
