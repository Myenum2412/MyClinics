import type { ClinicDocument } from "@/clinic/core/repository";

export type ExaminationStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "cancelled"
  /** Soft-deleted marker. Never accepted from API input (see dto). */
  | "deleted";

/**
 * Clinical examination record: patient + visit date + oral findings + notes.
 * Created/edited by clinical staff; patients can read their own records.
 */
export interface ExaminationDoc extends ClinicDocument {
  clinicId: string;
  examinationId: string;
  patientId: string;
  /** Denormalised snapshot for list rendering. */
  patientName: string;
  /** Authoring/owning doctor (null when created by staff/admin). */
  doctorId: string | null;
  /** YYYY-MM-DD examination date. */
  visitDate: string;
  status: ExaminationStatus;
  /** Oral examination findings (required). */
  oralFindings: string;
  notes: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function examinationToPublic(doc: ExaminationDoc) {
  return {
    examinationId: doc.examinationId,
    patientId: doc.patientId,
    patientName: doc.patientName,
    doctorId: doc.doctorId,
    visitDate: doc.visitDate,
    status: doc.status,
    oralFindings: doc.oralFindings,
    notes: doc.notes,
    createdBy: doc.createdBy,
    createdByName: doc.createdByName,
    clinicId: doc.clinicId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
