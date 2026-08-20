import type { ClinicDocument } from "@/clinic/core/repository";

export interface ReportDoc extends ClinicDocument {
  clinicId: string;
  reportId: string;
  patientId: string;
  doctorId: string | null;
  type: string;
  title: string;
  description: string | null;
  /** Legacy: external/legacy file URL (kept for old reports). */
  fileUrl: string | null;
  /** Medical-record file id — the attachment lives in the patient's drive. */
  fileId: string | null;
  mimeType: string | null;
  status: "uploaded" | "processing" | "ready" | "failed";
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function reportToPublic(doc: ReportDoc) {
  return {
    reportId: doc.reportId,
    patientId: doc.patientId,
    doctorId: doc.doctorId,
    type: doc.type,
    title: doc.title,
    description: doc.description,
    fileUrl: doc.fileUrl,
    fileId: doc.fileId ?? null,
    mimeType: doc.mimeType,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}