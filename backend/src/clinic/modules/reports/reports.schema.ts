import type { ClinicDocument } from "@/clinic/core/repository";

export interface ReportDoc extends ClinicDocument {
  clinicId: string;
  reportId: string;
  patientId: string;
  doctorId: string | null;
  type: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
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
    mimeType: doc.mimeType,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}