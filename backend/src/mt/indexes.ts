import type { Db } from "mongodb";
import { MT_COLLECTIONS } from "@/mt/core/collections";

/**
 * Indexes for the multi-tenant domain, created idempotently at startup.
 * Every compound index leads with `clinicId` so tenant-scoped queries
 * always use an index prefix — and the unique constraints keep tenant
 * boundaries explicit (e.g. one patient record per clinic per user).
 */
export async function ensureMultiTenantIndexes(db: Db): Promise<void> {
  const clinics = db.collection(MT_COLLECTIONS.clinics);
  const users = db.collection(MT_COLLECTIONS.users);
  const patients = db.collection(MT_COLLECTIONS.patients);
  const appointments = db.collection(MT_COLLECTIONS.appointments);
  const medicalRecords = db.collection(MT_COLLECTIONS.medicalRecords);
  const prescriptions = db.collection(MT_COLLECTIONS.prescriptions);
  const auditLogs = db.collection(MT_COLLECTIONS.auditLogs);

  await Promise.all([
    clinics.createIndex({ clinicId: 1 }, { unique: true }),
    clinics.createIndex({ slug: 1 }, { unique: true }),
    clinics.createIndex({ status: 1 }),

    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ clinicId: 1, userId: 1 }, { unique: true }),
    users.createIndex({ clinicId: 1, role: 1 }),
    users.createIndex({ clinicId: 1, createdAt: -1 }),

    patients.createIndex({ _id: 1, clinicId: 1 }),
    patients.createIndex({ patientId: 1, clinicId: 1 }, { unique: true }),
    patients.createIndex({ clinicId: 1, userId: 1 }, { unique: true, sparse: true }),
    patients.createIndex({ clinicId: 1, createdAt: -1 }),
    patients.createIndex({ clinicId: 1, mobile: 1 }),
    patients.createIndex({ clinicId: 1, fullName: 1 }),
    patients.createIndex({ clinicId: 1, email: 1 }),

    appointments.createIndex({ _id: 1, clinicId: 1 }),
    appointments.createIndex({ appointmentId: 1, clinicId: 1 }, { unique: true }),
    appointments.createIndex({ clinicId: 1, patientId: 1, date: -1 }),
    appointments.createIndex({ clinicId: 1, date: 1, status: 1 }),
    appointments.createIndex({ clinicId: 1, doctorUserId: 1, date: 1 }),

    medicalRecords.createIndex({ _id: 1, clinicId: 1 }),
    medicalRecords.createIndex({ recordId: 1, clinicId: 1 }, { unique: true }),
    medicalRecords.createIndex({ clinicId: 1, patientId: 1, createdAt: -1 }),

    prescriptions.createIndex({ _id: 1, clinicId: 1 }),
    prescriptions.createIndex({ prescriptionId: 1, clinicId: 1 }, { unique: true }),
    prescriptions.createIndex({ clinicId: 1, patientId: 1, createdAt: -1 }),

    auditLogs.createIndex({ clinicId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, entity: 1, entityId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, actorId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, "metadata.patientId": 1, createdAt: -1 }),
  ]);
}