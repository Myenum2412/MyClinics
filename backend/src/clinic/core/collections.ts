/**
 * Every collection in the clinic (multi-tenant) domain carries `clinicId` on
 * every document. Nothing is ever queried without it — enforcement happens in
 * the tenant-scoped repository base class.
 *
 * Naming: `clc_` prefix keeps the tenant domain completely separate from
 * legacy platform collections (patients, appointments, …).
 */
export const CLINIC_COLLECTIONS = {
  clinics: "clc_clinics",
  users: "clc_users",
  doctors: "clc_doctors",
  staff: "clc_staff",
  patients: "clc_patients",
  appointments: "clc_appointments",
  medicalRecords: "clc_medicine",
  medicalRecordFiles: "clc_medical_record_files",
  prescriptions: "clc_prescriptions",
  bills: "clc_bills",
  reports: "clc_reports",
  settings: "clc_settings",
  notifications: "clc_notifications",
  auditLogs: "clc_audit_logs",
  prescriptionNotifications: "clc_prescription_notifications",
  appointmentNotifications: "clc_appointment_notifications",
} as const;

export type ClinicCollectionName =
  (typeof CLINIC_COLLECTIONS)[keyof typeof CLINIC_COLLECTIONS];
