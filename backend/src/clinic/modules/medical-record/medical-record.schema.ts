import type { ClinicDocument } from "@/clinic/core/repository";

export interface MedicalRecordFileDoc extends ClinicDocument {
  clinicId: string;
  fileId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  fileName: string;
  r2Key: string;
  mimeType: string | null;
  size: number;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: Date;
  deletedAt?: Date;
}

export function medicalRecordFileToPublic(doc: MedicalRecordFileDoc) {
  return {
    fileId: doc.fileId,
    patientId: doc.patientId,
    patientName: doc.patientName,
    patientPhone: doc.patientPhone,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    size: doc.size,
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploadedByName,
    createdAt: doc.createdAt,
  };
}