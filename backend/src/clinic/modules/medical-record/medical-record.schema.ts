import type { ClinicDocument } from "@/clinic/core/repository";

export interface MedicalRecordFileVersion {
  version: number;
  r2Key: string;
  fileName: string;
  mimeType: string | null;
  size: number;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: Date;
}

export interface MedicalRecordFileDoc extends ClinicDocument {
  clinicId: string;
  fileId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  fileName: string;
  r2Key: string;
  /** Folder key — a default folder key or a custom folder id. */
  folder: string;
  mimeType: string | null;
  size: number;
  version: number;
  /** Prior versions of this file (newest first). */
  versions: MedicalRecordFileVersion[];
  downloadCount: number;
  lastDownloadedAt: Date | null;
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
  /** Default folders are per-patient built-ins; custom folders have null. */
  isDefault: boolean;
  defaultKey: string | null;
  /** Parent folder id — null for root level folders. */
  parentFolderId: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date;
}

/** Outcome of the automatic WhatsApp copy sent to the patient on upload. */
export type WhatsAppCopyStatus = "queued" | "skipped_no_phone" | "failed";

export interface WhatsAppCopyResult {
  status: WhatsAppCopyStatus;
  /** true when the file exceeded the 1.5MB inline-media limit and only a portal link was shared. */
  largeFile: boolean;
}

export function medicalRecordFileToPublic(
  doc: MedicalRecordFileDoc,
  whatsapp?: WhatsAppCopyResult
) {
  return {
    fileId: doc.fileId,
    patientId: doc.patientId,
    patientName: doc.patientName,
    patientPhone: doc.patientPhone,
    fileName: doc.fileName,
    folder: doc.folder,
    mimeType: doc.mimeType,
    size: doc.size,
    version: doc.version,
    versions: (doc.versions ?? []).map((v) => ({
      version: v.version,
      fileName: v.fileName,
      mimeType: v.mimeType,
      size: v.size,
      uploadedByName: v.uploadedByName,
      createdAt: v.createdAt,
    })),
    downloadCount: doc.downloadCount ?? 0,
    lastDownloadedAt: doc.lastDownloadedAt ?? null,
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploadedByName,
    createdAt: doc.createdAt,
    whatsapp,
  };
}

export function medicalRecordFolderToPublic(doc: MedicalRecordFolderDoc) {
  return {
    folderId: doc.folderId,
    patientId: doc.patientId,
    name: doc.name,
    isDefault: doc.isDefault,
    defaultKey: doc.defaultKey,
    parentFolderId: doc.parentFolderId ?? null,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}

/** Default per-patient subfolders (Google Drive style). */
export const DEFAULT_SUBFOLDERS: { key: string; name: string }[] = [
  { key: "prescriptions", name: "Prescriptions" },
  { key: "lab-reports", name: "Lab Reports" },
  { key: "x-rays", name: "X Rays" },
  { key: "scans", name: "Scans" },
  { key: "certificates", name: "Certificates" },
  { key: "bills", name: "Bills and Invoices" },
  { key: "insurance", name: "Insurance" },
  { key: "other-documents", name: "Other Documents" },
  { key: "medical-records", name: "Medical Records" },
  { key: "medicine", name: "Medicine" },
  { key: "billing", name: "Billing" },
  { key: "appointments", name: "Appointments" },
  { key: "patients", name: "Patients" },
];

/**
 * Virtual folders backed by the legacy R2 layout
 * (`reports/patients/{patientId}/{dir}/`). Files under these prefixes are
 * listed live from R2 and merged into the drive view.
 */
export const VIRTUAL_FOLDER_R2_DIR: Record<string, string> = {
  medicine: "Medicines",
  prescriptions: "Prescriptions",
  billing: "Billing",
  appointments: "Appointments",
  patients: "Patients",
};

export function isVirtualFolderKey(key: string): boolean {
  return key in VIRTUAL_FOLDER_R2_DIR;
}

export function defaultFolderKeyToId(patientId: string, key: string): string {
  return `mrfld_${patientId}_${key}`;
}

export { type ClinicDocument };