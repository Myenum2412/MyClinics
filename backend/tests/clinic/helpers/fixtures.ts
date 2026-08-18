import type { Db } from "mongodb";
import { createFakeDb } from "../../helpers/fake-db";
import type { ClinicContext } from "@/clinic/core/context";

process.env.CLINIC_JWT_SECRET ??= "test-secret-for-clinic-jwt-at-least-16-chars";

export const CLINIC_A = "clc_aaaaaaaaaaaaaaaaaa";
export const CLINIC_B = "clc_bbbbbbbbbbbbbbbbbb";
export const CLINIC_C = "clc_cccccccccccccccccc";

export const USER_ADMIN_A = "usr_admin_a";
export const USER_ADMIN_B = "usr_admin_b";
export const USER_DOCTOR_A1 = "usr_doc_a1";
export const USER_DOCTOR_A2 = "usr_doc_a2";
export const USER_DOCTOR_B1 = "usr_doc_b1";
export const USER_STAFF_A = "usr_staff_a";
export const USER_PATIENT_A1 = "usr_pat_a1";
export const USER_PATIENT_A2 = "usr_pat_a2";
export const USER_PATIENT_B1 = "usr_pat_b1";

export const DOCTOR_A1 = "doc_a1aaaaaaaaaaaaa";
export const DOCTOR_A2 = "doc_a2aaaaaaaaaaaaa";
export const DOCTOR_B1 = "doc_b1aaaaaaaaaaaaa";

export const STAFF_A1 = "stf_a1aaaaaaaaaaaaa";

export const PATIENT_A1 = "pat_a1aaaaaaaaaaaaa";
export const PATIENT_A2 = "pat_a2aaaaaaaaaaaaa";
export const PATIENT_B1 = "pat_b1aaaaaaaaaaaaa";

export const APPOINTMENT_A1 = "apt_a1aaaaaaaaaaaaa";
export const APPOINTMENT_A2 = "apt_a2aaaaaaaaaaaaa";
export const APPOINTMENT_B1 = "apt_b1aaaaaaaaaaaaa";

export const RECORD_A1 = "mrc_a1aaaaaaaaaaaaa";
export const RECORD_A2 = "mrc_a2aaaaaaaaaaaaa";
export const RECORD_B1 = "mrc_b1aaaaaaaaaaaaa";

export const PRESCRIPTION_A1 = "rx_a1aaaaaaaaaaaaaa";
export const PRESCRIPTION_A2 = "rx_a2aaaaaaaaaaaaaa";
export const PRESCRIPTION_B1 = "rx_b1aaaaaaaaaaaaaa";

export const BILL_A1 = "bil_a1aaaaaaaaaaaaa";
export const BILL_A2 = "bil_a2aaaaaaaaaaaaa";
export const BILL_B1 = "bil_b1aaaaaaaaaaaaa";

export const REPORT_A1 = "rpt_a1aaaaaaaaaaaaa";
export const REPORT_A2 = "rpt_a2aaaaaaaaaaaaa";
export const REPORT_B1 = "rpt_b1aaaaaaaaaaaaa";

export const NOTIFICATION_A1 = "ntf_a1aaaaaaaaaaaaa";
export const NOTIFICATION_A2 = "ntf_a2aaaaaaaaaaaaa";

function ctx(partial: Partial<ClinicContext> & Pick<ClinicContext, "userId" | "clinicId" | "role">): ClinicContext {
  return {
    name: null,
    email: null,
    doctorId: null,
    patientId: null,
    tokenId: "test-jti",
    ip: "127.0.0.1",
    userAgent: "test",
    ...partial,
  };
}

export const adminA = ctx({ userId: USER_ADMIN_A, clinicId: CLINIC_A, role: "clinic_admin", name: "Admin A" });
export const adminB = ctx({ userId: USER_ADMIN_B, clinicId: CLINIC_B, role: "clinic_admin", name: "Admin B" });
export const doctorA1 = ctx({ userId: USER_DOCTOR_A1, clinicId: CLINIC_A, role: "doctor", doctorId: DOCTOR_A1, name: "Doctor A1" });
export const doctorA2 = ctx({ userId: USER_DOCTOR_A2, clinicId: CLINIC_A, role: "doctor", doctorId: DOCTOR_A2, name: "Doctor A2" });
export const doctorB1 = ctx({ userId: USER_DOCTOR_B1, clinicId: CLINIC_B, role: "doctor", doctorId: DOCTOR_B1, name: "Doctor B1" });
export const staffA = ctx({ userId: USER_STAFF_A, clinicId: CLINIC_A, role: "staff", name: "Staff A" });
export const patientA1 = ctx({ userId: USER_PATIENT_A1, clinicId: CLINIC_A, role: "patient", patientId: PATIENT_A1, name: "Patient A1" });
export const patientA2 = ctx({ userId: USER_PATIENT_A2, clinicId: CLINIC_A, role: "patient", patientId: PATIENT_A2, name: "Patient A2" });
export const patientB1 = ctx({ userId: USER_PATIENT_B1, clinicId: CLINIC_B, role: "patient", patientId: PATIENT_B1, name: "Patient B1" });

export const now = () => new Date("2026-01-01T00:00:00Z");

/**
 * Seeds two fully populated clinics (A with two doctors, B with one) plus
 * all resource types, so isolation tests can prove A never sees B.
 */
export function seedIsolationDb(): { db: Db; dump: (name: string) => Record<string, unknown>[] } {
  const t = now();
  const { db, dump } = createFakeDb({
    clc_clinics: [
      { clinicId: CLINIC_A, slug: "clinic-a", name: "Clinic A", status: "active", settings: {}, createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, slug: "clinic-b", name: "Clinic B", status: "active", settings: {}, createdAt: t, updatedAt: t },
      { clinicId: CLINIC_C, slug: "clinic-c", name: "Clinic C", status: "active", settings: {}, createdAt: t, updatedAt: t },
    ],
    clc_users: [
      { clinicId: CLINIC_A, userId: USER_ADMIN_A, name: "Admin A", email: "admina@test.com", role: "clinic_admin", status: "active", createdAt: t },
      { clinicId: CLINIC_B, userId: USER_ADMIN_B, name: "Admin B", email: "adminb@test.com", role: "clinic_admin", status: "active", createdAt: t },
      { clinicId: CLINIC_A, userId: USER_DOCTOR_A1, name: "Doc A1", email: "doca1@test.com", role: "doctor", doctorId: DOCTOR_A1, status: "active", createdAt: t },
      { clinicId: CLINIC_A, userId: USER_DOCTOR_A2, name: "Doc A2", email: "doca2@test.com", role: "doctor", doctorId: DOCTOR_A2, status: "active", createdAt: t },
      { clinicId: CLINIC_B, userId: USER_DOCTOR_B1, name: "Doc B1", email: "docb1@test.com", role: "doctor", doctorId: DOCTOR_B1, status: "active", createdAt: t },
      { clinicId: CLINIC_A, userId: USER_STAFF_A, name: "Staff A", email: "staffa@test.com", role: "staff", status: "active", createdAt: t },
      { clinicId: CLINIC_A, userId: USER_PATIENT_A1, name: "Patient A1", email: "pa1@test.com", role: "patient", patientId: PATIENT_A1, status: "active", createdAt: t },
      { clinicId: CLINIC_A, userId: USER_PATIENT_A2, name: "Patient A2", email: "pa2@test.com", role: "patient", patientId: PATIENT_A2, status: "active", createdAt: t },
      { clinicId: CLINIC_B, userId: USER_PATIENT_B1, name: "Patient B1", email: "pb1@test.com", role: "patient", patientId: PATIENT_B1, status: "active", createdAt: t },
    ],
    clc_doctors: [
      { clinicId: CLINIC_A, doctorId: DOCTOR_A1, userId: USER_DOCTOR_A1, name: "Doctor A1", specialization: "Cardiology", status: "active", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, doctorId: DOCTOR_A2, userId: USER_DOCTOR_A2, name: "Doctor A2", specialization: "Neurology", status: "active", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, doctorId: DOCTOR_B1, userId: USER_DOCTOR_B1, name: "Doctor B1", specialization: "Cardiology", status: "active", createdAt: t, updatedAt: t },
    ],
    clc_staff: [
      { clinicId: CLINIC_A, staffId: STAFF_A1, userId: null, name: "Staff A1", position: "receptionist", status: "active", createdAt: t, updatedAt: t },
    ],
    clc_patients: [
      { clinicId: CLINIC_A, patientId: PATIENT_A1, doctorId: DOCTOR_A1, userId: USER_PATIENT_A1, fullName: "Patient A1", mobile: "9000000001", status: "active", allergies: [], createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, patientId: PATIENT_A2, doctorId: DOCTOR_A2, userId: USER_PATIENT_A2, fullName: "Patient A2", mobile: "9000000002", status: "active", allergies: [], createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, patientId: PATIENT_B1, doctorId: DOCTOR_B1, userId: USER_PATIENT_B1, fullName: "Patient B1", mobile: "9000000003", status: "active", allergies: [], createdAt: t, updatedAt: t },
    ],
    clc_appointments: [
      { clinicId: CLINIC_A, appointmentId: APPOINTMENT_A1, patientId: PATIENT_A1, doctorId: DOCTOR_A1, date: "2026-01-10", time: "10:00", status: "scheduled", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, appointmentId: APPOINTMENT_A2, patientId: PATIENT_A2, doctorId: DOCTOR_A2, date: "2026-01-10", time: "11:00", status: "scheduled", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, appointmentId: APPOINTMENT_B1, patientId: PATIENT_B1, doctorId: DOCTOR_B1, date: "2026-01-10", time: "12:00", status: "scheduled", createdAt: t, updatedAt: t },
    ],
    clc_medical_records: [
      { clinicId: CLINIC_A, recordId: RECORD_A1, patientId: PATIENT_A1, doctorId: DOCTOR_A1, diagnosis: "A1 diagnosis", visitDate: "2026-01-10", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, recordId: RECORD_A2, patientId: PATIENT_A2, doctorId: DOCTOR_A2, diagnosis: "A2 diagnosis", visitDate: "2026-01-10", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, recordId: RECORD_B1, patientId: PATIENT_B1, doctorId: DOCTOR_B1, diagnosis: "B1 diagnosis", visitDate: "2026-01-10", createdAt: t, updatedAt: t },
    ],
    clc_prescriptions: [
      { clinicId: CLINIC_A, prescriptionId: PRESCRIPTION_A1, patientId: PATIENT_A1, doctorId: DOCTOR_A1, visitDate: "2026-01-10", medicines: [{ name: "Aspirin" }], createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, prescriptionId: PRESCRIPTION_A2, patientId: PATIENT_A2, doctorId: DOCTOR_A2, visitDate: "2026-01-10", medicines: [{ name: "Paracetamol" }], createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, prescriptionId: PRESCRIPTION_B1, patientId: PATIENT_B1, doctorId: DOCTOR_B1, visitDate: "2026-01-10", medicines: [{ name: "Ibuprofen" }], createdAt: t, updatedAt: t },
    ],
    clc_bills: [
      { clinicId: CLINIC_A, billId: BILL_A1, billNumber: "B-2026-0001", patientId: PATIENT_A1, doctorId: DOCTOR_A1, items: [], subtotal: 500, discount: 0, taxPercent: 0, taxAmount: 0, total: 500, status: "paid", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, billId: BILL_A2, billNumber: "B-2026-0002", patientId: PATIENT_A2, doctorId: DOCTOR_A2, items: [], subtotal: 800, discount: 0, taxPercent: 0, taxAmount: 0, total: 800, status: "issued", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, billId: BILL_B1, billNumber: "B-2026-0001", patientId: PATIENT_B1, doctorId: DOCTOR_B1, items: [], subtotal: 300, discount: 0, taxPercent: 0, taxAmount: 0, total: 300, status: "draft", createdAt: t, updatedAt: t },
    ],
    clc_reports: [
      { clinicId: CLINIC_A, reportId: REPORT_A1, patientId: PATIENT_A1, doctorId: DOCTOR_A1, type: "X-Ray", title: "Chest X-Ray A1", status: "ready", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_A, reportId: REPORT_A2, patientId: PATIENT_A2, doctorId: DOCTOR_A2, type: "MRI", title: "MRI A2", status: "ready", createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, reportId: REPORT_B1, patientId: PATIENT_B1, doctorId: DOCTOR_B1, type: "Blood", title: "Blood B1", status: "ready", createdAt: t, updatedAt: t },
    ],
    clc_settings: [
      { clinicId: CLINIC_A, workingHours: { open: "09:00", close: "18:00" }, slotMinutes: 30, currency: "INR", timezone: "Asia/Kolkata", smsEnabled: false, emailNotifications: false, createdAt: t, updatedAt: t },
      { clinicId: CLINIC_B, workingHours: { open: "10:00", close: "17:00" }, slotMinutes: 45, currency: "USD", timezone: "UTC", smsEnabled: true, emailNotifications: false, createdAt: t, updatedAt: t },
    ],
    clc_notifications: [
      { clinicId: CLINIC_A, notificationId: NOTIFICATION_A1, recipientUserId: USER_PATIENT_A1, type: "appointment", title: "Reminder A1", readAt: null, createdAt: t },
      { clinicId: CLINIC_A, notificationId: NOTIFICATION_A2, recipientUserId: USER_PATIENT_A2, type: "bill", title: "Bill A2", readAt: null, createdAt: t },
    ],
    clc_audit_logs: [
      { clinicId: CLINIC_A, auditId: "aud_1", actorId: USER_ADMIN_A, action: "create", entity: "patient", entityId: PATIENT_A1, createdAt: t },
      { clinicId: CLINIC_B, auditId: "aud_2", actorId: USER_ADMIN_B, action: "create", entity: "patient", entityId: PATIENT_B1, createdAt: t },
    ],
  });
  return { db, dump };
}