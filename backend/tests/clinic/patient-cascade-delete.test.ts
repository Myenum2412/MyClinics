import { describe, expect, it } from "vitest";
import { PatientService } from "@/clinic/modules/patients/patients.service";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import {
  seedIsolationDb,
  adminA,
  PATIENT_A1,
  PATIENT_A2,
  PATIENT_B1,
  USER_PATIENT_A1,
  USER_PATIENT_A2,
  USER_PATIENT_B1,
  APPOINTMENT_A1,
  APPOINTMENT_A2,
  APPOINTMENT_B1,
  RECORD_A1,
  RECORD_A2,
  RECORD_B1,
  PRESCRIPTION_A1,
  PRESCRIPTION_A2,
  PRESCRIPTION_B1,
  BILL_A1,
  BILL_A2,
  BILL_B1,
  NOTIFICATION_A1,
  NOTIFICATION_A2,
} from "./helpers/fixtures";

describe("Patient Cascading Delete Integration Tests", () => {
  it("should perform cascading delete on patient A1 and not affect other patient A2 or clinic B", async () => {
    const { db } = seedIsolationDb();
    const service = new PatientService(db);

    // Call delete patient
    await service.deletePatient(adminA, PATIENT_A1);

    // 1. Verify Patient A1 is soft-deleted
    const patientA1Doc = await db.collection(CLINIC_COLLECTIONS.patients).findOne({ patientId: PATIENT_A1 });
    expect(patientA1Doc?.status).toBe("deleted");
    expect(patientA1Doc?.deletedAt).toBeInstanceOf(Date);

    // 2. Verify User Account of Patient A1 is soft-deleted
    const userA1Doc = await db.collection(CLINIC_COLLECTIONS.users).findOne({ userId: USER_PATIENT_A1 });
    expect(userA1Doc?.status).toBe("deleted");
    expect(userA1Doc?.deletedAt).toBeInstanceOf(Date);

    // 3. Verify Appointment of Patient A1 is soft-deleted/cancelled
    const appointmentA1Doc = await db.collection(CLINIC_COLLECTIONS.appointments).findOne({ appointmentId: APPOINTMENT_A1 });
    expect(appointmentA1Doc?.status).toBe("cancelled");
    expect(appointmentA1Doc?.deletedAt).toBeInstanceOf(Date);

    // 4. Verify Medical Record of Patient A1 is soft-deleted
    const recordA1Doc = await db.collection(CLINIC_COLLECTIONS.medicalRecords).findOne({ recordId: RECORD_A1 });
    expect(recordA1Doc?.status).toBe("deleted");
    expect(recordA1Doc?.deletedAt).toBeInstanceOf(Date);

    // 5. Verify Prescription of Patient A1 is soft-deleted
    const prescriptionA1Doc = await db.collection(CLINIC_COLLECTIONS.prescriptions).findOne({ prescriptionId: PRESCRIPTION_A1 });
    expect(prescriptionA1Doc?.status).toBe("deleted");
    expect(prescriptionA1Doc?.deletedAt).toBeInstanceOf(Date);

    // 6. Verify Bill of Patient A1 is voided
    const billA1Doc = await db.collection(CLINIC_COLLECTIONS.bills).findOne({ billId: BILL_A1 });
    expect(billA1Doc?.status).toBe("void");
    expect(billA1Doc?.deletedAt).toBeInstanceOf(Date);

    // 7. Verify Notification of Patient A1 is deleted
    const notificationA1Doc = await db.collection(CLINIC_COLLECTIONS.notifications).findOne({ notificationId: NOTIFICATION_A1 });
    expect(notificationA1Doc).toBeNull();

    // 8. Verify Patient A2 in Clinic A is untouched
    const patientA2Doc = await db.collection(CLINIC_COLLECTIONS.patients).findOne({ patientId: PATIENT_A2 });
    expect(patientA2Doc?.status).toBe("active");
    expect(patientA2Doc?.deletedAt).toBeUndefined();

    const userA2Doc = await db.collection(CLINIC_COLLECTIONS.users).findOne({ userId: USER_PATIENT_A2 });
    expect(userA2Doc?.status).toBe("active");

    const appointmentA2Doc = await db.collection(CLINIC_COLLECTIONS.appointments).findOne({ appointmentId: APPOINTMENT_A2 });
    expect(appointmentA2Doc?.status).toBe("scheduled");

    const recordA2Doc = await db.collection(CLINIC_COLLECTIONS.medicalRecords).findOne({ recordId: RECORD_A2 });
    expect(recordA2Doc?.deletedAt).toBeUndefined();

    const prescriptionA2Doc = await db.collection(CLINIC_COLLECTIONS.prescriptions).findOne({ prescriptionId: PRESCRIPTION_A2 });
    expect(prescriptionA2Doc?.deletedAt).toBeUndefined();

    const billA2Doc = await db.collection(CLINIC_COLLECTIONS.bills).findOne({ billId: BILL_A2 });
    expect(billA2Doc?.status).toBe("issued");

    const notificationA2Doc = await db.collection(CLINIC_COLLECTIONS.notifications).findOne({ notificationId: NOTIFICATION_A2 });
    expect(notificationA2Doc).toBeDefined();

    // 9. Verify Patient B1 in Clinic B is untouched
    const patientB1Doc = await db.collection(CLINIC_COLLECTIONS.patients).findOne({ patientId: PATIENT_B1 });
    expect(patientB1Doc?.status).toBe("active");

    const userB1Doc = await db.collection(CLINIC_COLLECTIONS.users).findOne({ userId: USER_PATIENT_B1 });
    expect(userB1Doc?.status).toBe("active");

    const appointmentB1Doc = await db.collection(CLINIC_COLLECTIONS.appointments).findOne({ appointmentId: APPOINTMENT_B1 });
    expect(appointmentB1Doc?.status).toBe("scheduled");

    const recordB1Doc = await db.collection(CLINIC_COLLECTIONS.medicalRecords).findOne({ recordId: RECORD_B1 });
    expect(recordB1Doc?.deletedAt).toBeUndefined();

    const prescriptionB1Doc = await db.collection(CLINIC_COLLECTIONS.prescriptions).findOne({ prescriptionId: PRESCRIPTION_B1 });
    expect(prescriptionB1Doc?.deletedAt).toBeUndefined();

    const billB1Doc = await db.collection(CLINIC_COLLECTIONS.bills).findOne({ billId: BILL_B1 });
    expect(billB1Doc?.status).toBe("draft");
  });
});
