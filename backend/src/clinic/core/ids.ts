import { randomBytes, randomUUID } from "node:crypto";
import type { ClinicContext } from "@/clinic/core/context";

export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateClinicId(): string {
  return `clc_${randomToken(12)}`;
}

export function generateUserId(): string {
  return `usr_${randomToken(12)}`;
}

export function generateDoctorId(): string {
  return `doc_${randomToken(12)}`;
}

export function generateStaffId(): string {
  return `stf_${randomToken(12)}`;
}

export function generatePatientId(): string {
  return `pat_${randomToken(12)}`;
}

export function generateAppointmentId(): string {
  return `apt_${randomToken(12)}`;
}

export function generateRecordId(): string {
  return `mrc_${randomToken(12)}`;
}

export function generateFileId(): string {
  return `mrf_${randomToken(12)}`;
}

export function generateFolderId(): string {
  return `mrfld_${randomToken(12)}`;
}

export function generatePrescriptionId(): string {
  return `rx_${randomToken(12)}`;
}

export function generateBillId(): string {
  return `bil_${randomToken(12)}`;
}

export function generateReportId(): string {
  return `rpt_${randomToken(12)}`;
}

export function generateNotificationId(): string {
  return `ntf_${randomToken(12)}`;
}

export function generateUuid(): string {
  return randomUUID();
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || `clinic-${randomToken(4)}`;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Context used by the audit writer for system/tenantless actions. */
export function systemContext(clinicId?: string): ClinicContext | null {
  return clinicId
    ? {
        userId: "system",
        clinicId,
        role: "clinic_admin",
        name: "System",
        email: null,
        doctorId: null,
        patientId: null,
        tokenId: "",
        ip: null,
        userAgent: null,
      }
    : null;
}
