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
 *
 * `category` scopes the record to a report type (vital test, x-ray, blood
 * report, biopsy, other) and `details` carries the category-specific form
 * fields — both are opaque to the server.
 */
export type InvestigationCategory =
  | "vital-test"
  | "x-ray"
  | "blood-report"
  | "biopsy"
  | "other";

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
  /** Report type: vital-test | x-ray | blood-report | biopsy | other. */
  category: InvestigationCategory;
  /** Category-specific form fields (opaque to the server). */
  details: Record<string, unknown> | null;
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
    category: doc.category ?? "other",
    details: doc.details ?? null,
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

/**
 * Lightweight list item — omits the (potentially ~1MB) `chartData` payload
 * so tables stay fast. Single-record reads still use `investigationToPublic`.
 * `hasChart` drives the "Charted" badge; fetch one record to get the chart.
 */
export function investigationToListItem(doc: InvestigationDoc) {
  const { chartData: _chart, ...rest } = investigationToPublic(doc);
  void _chart;
  return {
    ...rest,
    chartData: null,
    hasChart: doc.chartData != null,
  };
}
