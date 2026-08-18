/**
 * Every collection in the multi-tenant domain carries `clinicId` on every
 * document. Nothing is ever queried without it — enforcement happens in the
 * tenant-scoped repository base class.
 */
export const MT_COLLECTIONS = {
  clinics: "mt_clinics",
  users: "mt_users",
  patients: "mt_patients",
  appointments: "mt_appointments",
  medicalRecords: "mt_medical_records",
  prescriptions: "mt_prescriptions",
  auditLogs: "mt_audit_logs",
} as const;

export type MtCollectionName = (typeof MT_COLLECTIONS)[keyof typeof MT_COLLECTIONS];
