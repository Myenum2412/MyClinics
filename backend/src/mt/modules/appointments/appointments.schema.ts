export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no-show";

export interface AppointmentDoc {
  clinicId: string;
  appointmentId: string;
  patientId: string;
  doctorUserId: string | null;
  doctorName: string | null;
  department: string | null;
  date: string;
  time: string;
  reason: string | null;
  type: "in-person" | "video" | "phone";
  status: AppointmentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function mapAppointment(doc: Record<string, unknown>) {
  return {
    appointmentId: doc.appointmentId,
    clinicId: doc.clinicId,
    patientId: doc.patientId,
    doctorUserId: doc.doctorUserId ?? null,
    doctorName: doc.doctorName ?? null,
    department: doc.department ?? null,
    date: doc.date,
    time: doc.time,
    reason: doc.reason ?? null,
    type: doc.type,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}