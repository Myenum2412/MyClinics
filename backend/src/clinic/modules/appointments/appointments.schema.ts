import type { ClinicDocument } from "@/clinic/core/repository";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;

export interface AppointmentDoc extends ClinicDocument {
  clinicId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  status: (typeof APPOINTMENT_STATUSES)[number];
  reason: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  /** CronLite job id for this appointment's 1-hour reminder (null when not scheduled). */
  cronliteJobId?: string | null;
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
  };
}