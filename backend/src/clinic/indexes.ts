import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";

/**
 * Indexes for the clinic (multi-tenant) domain, created idempotently at
 * startup. Every compound index leads with `clinicId` so tenant-scoped
 * queries always use an index prefix — and the unique constraints keep
 * tenant boundaries explicit (e.g. one patient record per clinic per user,
 * one user per email).
 */
export async function ensureClinicIndexes(db: Db): Promise<void> {
  const clinics = db.collection(CLINIC_COLLECTIONS.clinics);
  const users = db.collection(CLINIC_COLLECTIONS.users);
  const doctors = db.collection(CLINIC_COLLECTIONS.doctors);
  const staff = db.collection(CLINIC_COLLECTIONS.staff);
  const patients = db.collection(CLINIC_COLLECTIONS.patients);
  const appointments = db.collection(CLINIC_COLLECTIONS.appointments);
  const medicalRecords = db.collection(CLINIC_COLLECTIONS.medicalRecords);
  const prescriptions = db.collection(CLINIC_COLLECTIONS.prescriptions);
  const bills = db.collection(CLINIC_COLLECTIONS.bills);
  const reports = db.collection(CLINIC_COLLECTIONS.reports);
  const settings = db.collection(CLINIC_COLLECTIONS.settings);
  const notifications = db.collection(CLINIC_COLLECTIONS.notifications);
  const auditLogs = db.collection(CLINIC_COLLECTIONS.auditLogs);

  await Promise.all([
    // ── Clinics ──────────────────────────────────────────────────────────
    clinics.createIndex({ clinicId: 1 }, { unique: true }),
    clinics.createIndex({ slug: 1 }, { unique: true }),
    clinics.createIndex({ status: 1, createdAt: -1 }),
    clinics.createIndex({ name: 1 }),

    // ── Users (accounts) ─────────────────────────────────────────────────
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ userId: 1 }, { unique: true }),
    users.createIndex({ clinicId: 1, role: 1, status: 1 }),
    users.createIndex({ clinicId: 1, createdAt: -1 }),
    // Only one doctor/staff/patient profile linked per account per clinic.
    // Partial (not sparse): user docs always carry the link fields as null,
    // and a sparse index still indexes explicit nulls — which would collide
    // on the second null-valued user in a clinic.
    users.createIndex(
      { clinicId: 1, doctorId: 1 },
      { unique: true, partialFilterExpression: { doctorId: { $type: "string" } } }
    ),
    users.createIndex(
      { clinicId: 1, staffId: 1 },
      { unique: true, partialFilterExpression: { staffId: { $type: "string" } } }
    ),
    users.createIndex(
      { clinicId: 1, patientId: 1 },
      { unique: true, partialFilterExpression: { patientId: { $type: "string" } } }
    ),

    // ── Doctors ──────────────────────────────────────────────────────────
    doctors.createIndex({ clinicId: 1, doctorId: 1 }, { unique: true }),
    doctors.createIndex(
      { clinicId: 1, userId: 1 },
      { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
    ),
    doctors.createIndex({ clinicId: 1, specialization: 1 }),
    doctors.createIndex({ clinicId: 1, status: 1, createdAt: -1 }),
    doctors.createIndex({ clinicId: 1, name: 1 }),

    // ── Staff ────────────────────────────────────────────────────────────
    staff.createIndex({ clinicId: 1, staffId: 1 }, { unique: true }),
    staff.createIndex(
      { clinicId: 1, userId: 1 },
      { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
    ),
    staff.createIndex({ clinicId: 1, position: 1 }),
    staff.createIndex({ clinicId: 1, status: 1, createdAt: -1 }),

    // ── Patients ─────────────────────────────────────────────────────────
    patients.createIndex({ clinicId: 1, patientId: 1 }, { unique: true }),
    patients.createIndex(
      { clinicId: 1, userId: 1 },
      { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
    ),
    patients.createIndex({ clinicId: 1, doctorId: 1, status: 1, createdAt: -1 }),
    patients.createIndex({ clinicId: 1, mobile: 1 }),
    patients.createIndex({ clinicId: 1, fullName: 1 }),
    patients.createIndex({ clinicId: 1, email: 1 }),

    // ── Appointments ─────────────────────────────────────────────────────
    appointments.createIndex({ clinicId: 1, appointmentId: 1 }, { unique: true }),
    appointments.createIndex({ clinicId: 1, doctorId: 1, date: -1, time: -1 }),
    appointments.createIndex({ clinicId: 1, patientId: 1, date: -1 }),
    // Double-booking prevention (unique slot per doctor).
    appointments.createIndex(
      { clinicId: 1, doctorId: 1, date: 1, time: 1, status: 1 },
      { unique: true, partialFilterExpression: { status: "scheduled" } }
    ),

    // ── Medical records ──────────────────────────────────────────────────
    medicalRecords.createIndex({ clinicId: 1, recordId: 1 }, { unique: true }),
    medicalRecords.createIndex({ clinicId: 1, patientId: 1, visitDate: -1 }),
    medicalRecords.createIndex({ clinicId: 1, doctorId: 1, visitDate: -1 }),

    // ── Prescriptions ────────────────────────────────────────────────────
    prescriptions.createIndex({ clinicId: 1, prescriptionId: 1 }, { unique: true }),
    prescriptions.createIndex({ clinicId: 1, patientId: 1, visitDate: -1 }),
    prescriptions.createIndex({ clinicId: 1, doctorId: 1, visitDate: -1 }),

    // ── Billing ──────────────────────────────────────────────────────────
    bills.createIndex({ clinicId: 1, billId: 1 }, { unique: true }),
    bills.createIndex({ clinicId: 1, billNumber: 1 }, { unique: true }),
    bills.createIndex({ clinicId: 1, patientId: 1, createdAt: -1 }),
    bills.createIndex({ clinicId: 1, status: 1, createdAt: -1 }),
    bills.createIndex({ clinicId: 1, doctorId: 1, createdAt: -1 }),

    // ── Reports ──────────────────────────────────────────────────────────
    reports.createIndex({ clinicId: 1, reportId: 1 }, { unique: true }),
    reports.createIndex({ clinicId: 1, patientId: 1, createdAt: -1 }),
    reports.createIndex({ clinicId: 1, doctorId: 1, createdAt: -1 }),
    reports.createIndex({ clinicId: 1, type: 1, createdAt: -1 }),

    // ── Settings ─────────────────────────────────────────────────────────
    settings.createIndex({ clinicId: 1 }, { unique: true }),

    // ── Notifications ────────────────────────────────────────────────────
    notifications.createIndex({ clinicId: 1, recipientUserId: 1, createdAt: -1 }),
    notifications.createIndex({ clinicId: 1, recipientUserId: 1, readAt: 1 }),

    // ── Audit logs ───────────────────────────────────────────────────────
    auditLogs.createIndex({ clinicId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, entity: 1, entityId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, actorId: 1, createdAt: -1 }),
    auditLogs.createIndex({ clinicId: 1, action: 1, createdAt: -1 }),
  ]);
}