import { describe, expect, it } from "vitest";
import { NotFoundError } from "@/clinic/core/errors";
import { AppointmentService } from "@/clinic/modules/appointments/appointments.service";
import { BillingService } from "@/clinic/modules/billing/billing.service";
import { MedicalRecordService } from "@/clinic/modules/medical-records/medical-records.service";
import { NotificationService } from "@/clinic/modules/notifications/notifications.service";
import { PatientService } from "@/clinic/modules/patients/patients.service";
import { PrescriptionService } from "@/clinic/modules/prescriptions/prescriptions.service";
import { ReportService } from "@/clinic/modules/reports/reports.service";
import {
  APPOINTMENT_A1,
  APPOINTMENT_A2,
  BILL_A1,
  BILL_A2,
  NOTIFICATION_A2,
  PATIENT_A1,
  PATIENT_A2,
  patientA1,
  patientA2,
  PRESCRIPTION_A1,
  PRESCRIPTION_A2,
  RECORD_A1,
  RECORD_A2,
  REPORT_A1,
  REPORT_A2,
  seedIsolationDb,
} from "./helpers/fixtures";

/**
 * Patient-level isolation.
 *
 * A patient may only ever access their OWN profile and their OWN medical
 * data. Reading anything else (another patient, by any id) must return
 * NotFound — never data, never even a 403 hint that the record exists.
 */
describe("Patient isolation — patients see only their own data", () => {
  const { db } = seedIsolationDb();

  it("patient A1 lists only themselves", async () => {
    const service = new PatientService(db);
    const { items } = await service.listPatients(patientA1, { skip: 0, limit: 100 });
    expect(items.map((p) => p.patientId)).toEqual([PATIENT_A1]);
  });

  it("patient A1 cannot read patient A2 by id", async () => {
    const service = new PatientService(db);
    await expect(service.getPatientById(patientA1, PATIENT_A2)).rejects.toThrow(NotFoundError);
  });

  it("patient A1 cannot update patient A2", async () => {
    const service = new PatientService(db);
    await expect(
      service.updatePatient(patientA1, PATIENT_A2, { fullName: "Hacked" })
    ).rejects.toThrow(NotFoundError);
  });

  it("patient A1 sees only their own appointments", async () => {
    const service = new AppointmentService(db);
    const { items } = await service.listAppointments(patientA1, { skip: 0, limit: 100 });
    expect(items.map((a) => a.appointmentId)).toEqual([APPOINTMENT_A1]);
  });

  it("patient A1 cannot read patient A2's appointment", async () => {
    const service = new AppointmentService(db);
    await expect(service.getAppointment(patientA1, APPOINTMENT_A2)).rejects.toThrow(NotFoundError);
  });

  it("patient A1 sees only their own medical records", async () => {
    const service = new MedicalRecordService(db);
    const { items } = await service.listRecords(patientA1, { skip: 0, limit: 100 });
    expect(items.map((r) => r.recordId)).toEqual([RECORD_A1]);
  });

  it("patient A1 cannot read patient A2's medical record", async () => {
    const service = new MedicalRecordService(db);
    await expect(service.getRecord(patientA1, RECORD_A2)).rejects.toThrow(NotFoundError);
  });

  it("patient A1 sees only their own prescriptions", async () => {
    const service = new PrescriptionService(db);
    const { items } = await service.listPrescriptions(patientA1, { skip: 0, limit: 100 });
    expect(items.map((p) => p.prescriptionId)).toEqual([PRESCRIPTION_A1]);
  });

  it("patient A1 cannot read patient A2's prescription", async () => {
    const service = new PrescriptionService(db);
    await expect(service.getPrescription(patientA1, PRESCRIPTION_A2)).rejects.toThrow(NotFoundError);
  });

  it("patient A1 sees only their own bills", async () => {
    const service = new BillingService(db);
    const { items } = await service.listBills(patientA1, { skip: 0, limit: 100 });
    expect(items.map((b) => b.billId)).toEqual([BILL_A1]);
  });

  it("patient A1 cannot read patient A2's bill", async () => {
    const service = new BillingService(db);
    await expect(service.getBill(patientA1, BILL_A2)).rejects.toThrow(NotFoundError);
  });

  it("patient A1 sees only their own reports", async () => {
    const service = new ReportService(db);
    const { items } = await service.listReports(patientA1, { skip: 0, limit: 100 });
    expect(items.map((r) => r.reportId)).toEqual([REPORT_A1]);
  });

  it("patient A1 cannot read patient A2's report", async () => {
    const service = new ReportService(db);
    await expect(service.getReport(patientA1, REPORT_A2)).rejects.toThrow(NotFoundError);
  });

  it("patient A1 never sees patient A2's notifications", async () => {
    const service = new NotificationService(db);
    const result = await service.listMine(patientA1, { skip: 0, limit: 100 });
    expect(result.items.some((n) => n.notificationId === NOTIFICATION_A2)).toBe(false);
    expect(result.items.map((n) => n.notificationId)).toEqual(["ntf_a1aaaaaaaaaaaaa"]);
  });

  it("patient A1 cannot mark patient A2's notification as read", async () => {
    const service = new NotificationService(db);
    await expect(service.markRead(patientA1, NOTIFICATION_A2)).rejects.toThrow(NotFoundError);
  });
});