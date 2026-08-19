import type { ClinicDocument } from "@/clinic/core/repository";

export interface MedicineRecordDoc extends ClinicDocument {
  clinicId: string;
  recordId: string;
  patientId: string;
  /** Authoring doctor (scoped for doctor role). */
  doctorId: string;
  diagnosis: string;
  symptoms: string | null;
  treatment: string | null;
  notes: string | null;
  visitDate: string;
  attachments: { name: string; url: string | null; mimeType: string | null; fileId?: string | null }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function recordToPublic(doc: MedicineRecordDoc) {
  return {
    recordId: doc.recordId,
    patientId: doc.patientId,
    doctorId: doc.doctorId,
    diagnosis: doc.diagnosis,
    symptoms: doc.symptoms,
    treatment: doc.treatment,
    notes: doc.notes,
    visitDate: doc.visitDate,
    attachments: doc.attachments,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
