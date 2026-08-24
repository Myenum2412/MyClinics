import { nowMs } from "@/clinic/core/datetime";
import type { ClinicDocument } from "@/clinic/core/repository";

export interface ClinicWelcomeDocumentVersion {
  version: number;
  r2Key: string;
  fileName: string;
  mimeType: string | null;
  size: number;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: Date;
}

export interface ClinicWelcomeDocumentDoc extends ClinicDocument {
  clinicId: string;
  documentId: string;
  fileName: string;
  r2Key: string;
  mimeType: string | null;
  size: number;
  version: number;
  versions: ClinicWelcomeDocumentVersion[];
  downloadCount: number;
  lastDownloadedAt: Date | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: Date;
  deletedAt?: Date;
}

export function clinicWelcomeDocumentToPublic(doc: ClinicWelcomeDocumentDoc) {
  return {
    documentId: doc.documentId,
    fileName: doc.fileName,
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
  };
}

export function generateWelcomeDocumentId(): string {
  return `cwd_${nowMs()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function r2KeyForWelcomeDocument(clinicId: string, documentId: string, fileName: string): string {
  return `clinic-welcome/${clinicId}/${documentId}_${sanitizeFileName(fileName)}`;
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "file";
}

export function mimeFromName(name: string): string {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."));
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
  };
  return map[ext] ?? "application/octet-stream";
}