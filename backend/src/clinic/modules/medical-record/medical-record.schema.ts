import type { ClinicDocument } from "@/clinic/core/repository";

export interface MedicalRecordFileDoc extends ClinicDocument {
  clinicId: string;
  fileId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  fileName: string;
  r2Key: string;
  /** Folder key — "medicine" | "medical" | "prescriptions" or a custom folder id. */
  folder: string;
  mimeType: string | null;
  size: number;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: Date;
  deletedAt?: Date;
}

export interface MedicalRecordFolderDoc extends ClinicDocument {
  clinicId: string;
  folderId: string;
  patientId: string;
  name: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date;
}

export function medicalRecordFileToPublic(doc: MedicalRecordFileDoc) {
  return {
    fileId: doc.fileId,
    patientId: doc.patientId,
    patientName: doc.patientName,
    patientPhone: doc.patientPhone,
    fileName: doc.fileName,
    folder: doc.folder,
    mimeType: doc.mimeType,
    size: doc.size,
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploadedByName,
    createdAt: doc.createdAt,
  };
}

export function medicalRecordFolderToPublic(doc: MedicalRecordFolderDoc) {
  return {
    folderId: doc.folderId,
    patientId: doc.patientId,
    name: doc.name,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}