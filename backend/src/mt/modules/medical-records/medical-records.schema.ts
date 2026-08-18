export type MedicalRecordType = "consultation" | "lab" | "imaging" | "procedure" | "other";

export interface MedicalRecordDoc {
  clinicId: string;
  recordId: string;
  patientId: string;
  title: string;
  recordType: MedicalRecordType;
  summary: string;
  diagnosis: string | null;
  attachments: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function mapMedicalRecord(doc: Record<string, unknown>) {
  return {
    recordId: doc.recordId,
    clinicId: doc.clinicId,
    patientId: doc.patientId,
    title: doc.title,
    recordType: doc.recordType,
    summary: doc.summary,
    diagnosis: doc.diagnosis ?? null,
    attachments: doc.attachments ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}