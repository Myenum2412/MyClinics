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
  /** Hard/soft issue classification. */
  issueType: "hard" | "soft";
  /**
   * Link to the dental investigation (`clc_investigations.investigationId`)
   * created alongside this examination. Optional; must belong to the same
   * patient in the same clinic.
   */
  investigationId: string | null;
  /** Oral examination findings (required). */
  oralFindings: string;
  notes: string | null;
  /** Medical history captured at examination time (all optional). */
  allergies: string | null;
  medicalConditions: string | null;
  previousSurgeries: string | null;
  currentMedications: string | null;
  patientHistory: string | null;
  familyHistory: string | null;
  habits: string | null;
  /** History of presenting illness captured at examination time. */
  hpi: ExaminationHpi | null;
  /** Chief complaints recorded at examination time (moved from registration). */
  chiefComplaints: ExaminationChiefComplaint[] | null;
  /** Vital signs captured at examination time (moved from registration). */
  bloodPressure: string | null;
  temperature: string | null;
  pulse: string | null;
  respiratoryRate: string | null;
  spo2: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/** Mirrors the patient registration HPI shape (all fields optional). */
export interface ExaminationHpi {
  presentingComplaint: string | null;
  onset: string | null;
  durationValue: string | null;
  durationUnit: string | null;
  progression: string | null;
  symptoms: string | null;
  aggravatingFactors: string | null;
  relievingFactors: string | null;
  associatedSymptoms: string | null;
  previousTreatment: string | null;
  additionalNotes: string | null;
}

/** A single chief complaint entry recorded at examination time. */
export interface ExaminationChiefComplaint {
  complaint: string | null;
  duration: string | null;
  severity: string | null;
  notes: string | null;
}

export function examinationToPublic(doc: ExaminationDoc) {
  return {
    examinationId: doc.examinationId,
    patientId: doc.patientId,
    patientName: doc.patientName,
    doctorId: doc.doctorId,
    visitDate: doc.visitDate,
    status: doc.status,
    issueType: doc.issueType,
    investigationId: doc.investigationId,
    oralFindings: doc.oralFindings,
    notes: doc.notes,
    allergies: doc.allergies ?? null,
    medicalConditions: doc.medicalConditions ?? null,
    previousSurgeries: doc.previousSurgeries ?? null,
    currentMedications: doc.currentMedications ?? null,
    patientHistory: doc.patientHistory ?? null,
    familyHistory: doc.familyHistory ?? null,
    habits: doc.habits ?? null,
    hpi: doc.hpi ?? null,
    chiefComplaints: doc.chiefComplaints ?? null,
    bloodPressure: doc.bloodPressure ?? null,
    temperature: doc.temperature ?? null,
    pulse: doc.pulse ?? null,
    respiratoryRate: doc.respiratoryRate ?? null,
    spo2: doc.spo2 ?? null,
    createdBy: doc.createdBy,
    createdByName: doc.createdByName,
    clinicId: doc.clinicId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
