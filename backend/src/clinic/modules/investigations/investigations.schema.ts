import type { ClinicDocument } from "@/clinic/core/repository";

export type InvestigationStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "cancelled"
  /** Soft-deleted marker. Never accepted from API input (see dto). */
  | "deleted";

/**
 * Dental investigation record. The odontogram chart itself is stored as an
 * opaque JSON payload (`chartData`) produced by the client's
 * `getStatusChart()` and restored via `importStatus()` — the server never
 * interprets it, it only validates size + JSON-ness.
 */
export interface InvestigationDoc extends ClinicDocument {
  clinicId: string;
  investigationId: string;
  patientId: string;
  /** Denormalised snapshot for list rendering. */
  patientName: string;
  /** Authoring/owning doctor (null when created by staff/admin). */
  doctorId: string | null;
  title: string;
  notes: string | null;
  /** YYYY-MM-DD investigation date. */
  visitDate: string;
  status: InvestigationStatus;
  /** Serialised odontogram status-chart payload (nullable until charted). */
  chartData: Record<string, unknown> | null;
  /**
   * Link to the clinical medical record (`clc_medicine.recordId`) this
   * investigation belongs to. Optional; when set it must belong to the same
   * patient in the same clinic.
   */
  medicalRecordId: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function investigationToPublic(doc: InvestigationDoc) {
  return {
    investigationId: doc.investigationId,
    patientId: doc.patientId,
    patientName: doc.patientName,
    doctorId: doc.doctorId,
    title: doc.title,
    notes: doc.notes,
    visitDate: doc.visitDate,
    status: doc.status,
    chartData: doc.chartData,
    medicalRecordId: doc.medicalRecordId,
    createdBy: doc.createdBy,
    createdByName: doc.createdByName,
    clinicId: doc.clinicId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
