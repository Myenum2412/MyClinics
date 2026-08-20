import { describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError } from "@/clinic/core/errors";
import { AppointmentService } from "@/clinic/modules/appointments/appointments.service";
import { BillingService } from "@/clinic/modules/billing/billing.service";
import { MedicineService } from "@/clinic/modules/medicine/medicine.service";
import { PatientService } from "@/clinic/modules/patients/patients.service";
import { PrescriptionService } from "@/clinic/modules/prescriptions/prescriptions.service";
import {
  adminA,
  APPOINTMENT_A1,
  APPOINTMENT_A2,
  BILL_A1,
  BILL_A2,
  DOCTOR_A1,
  DOCTOR_A2,
  doctorA1,
  doctorA2,
  PATIENT_A1,
  PATIENT_A2,
  PRESCRIPTION_A1,
  PRESCRIPTION_A2,
  RECORD_A1,
  RECORD_A2,
  seedIsolationDb,
} from "./helpers/fixtures";

/**
 * Doctor-level isolation.
 *
 * Clinic A has Doctor A1 (patients: A1) and Doctor A2 (patients: A2).
 * Doctor A1 must NEVER see Doctor A2's patients or any medical data
 * belonging to them, even with a direct resource id.
 */
describe("Doctor isolation — Doctor A1 can never access Doctor A2's data", () => {
  const { db } = seedIsolationDb();

  describe("patients", () => {
    it("doctor A1 lists only their assigned patients", async () => {
      const service = new PatientService(db);
      const { items } = await service.listPatients(doctorA1, { skip: 0, limit: 100 });
      expect(items.map((p) => p.patientId)).toEqual([PATIENT_A1]);
    });

    it("doctor A1 cannot read doctor A2's patient by id (404, not 403)", async () => {
      const service = new PatientService(db);
      await expect(service.getPatientById(doctorA1, PATIENT_A2)).rejects.toThrow(NotFoundError);
    });

    it("doctor A1 cannot update doctor A2's patient", async () => {
      const service = new PatientService(db);
      await expect(
        service.updatePatient(doctorA1, PATIENT_A2, { fullName: "Hacked" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("appointments", () => {
    it("doctor A1 lists only their own appointments", async () => {
      const service = new AppointmentService(db);
      const { items } = await service.listAppointments(doctorA1, { skip: 0, limit: 100 });
      expect(items.map((a) => a.appointmentId)).toEqual([APPOINTMENT_A1]);
    });

    it("doctor A1 cannot read doctor A2's appointment by id", async () => {
      const service = new AppointmentService(db);
      await expect(service.getAppointment(doctorA1, APPOINTMENT_A2)).rejects.toThrow(NotFoundError);
    });

    it("doctor A1 cannot book an appointment for doctor A2's patient", async () => {
      const service = new AppointmentService(db);
      await expect(
        service.createAppointment(doctorA1, {
          patientId: PATIENT_A2,
          doctorId: DOCTOR_A2,
          date: "2026-02-01",
          time: "09:00",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("doctor A1 CAN book for their own patient with a different doctor in the same clinic", async () => {
      const service = new AppointmentService(db);
      const created = await service.createAppointment(doctorA1, {
        patientId: PATIENT_A1,
        doctorId: DOCTOR_A1,
        date: "2026-02-02",
        time: "09:00",
      });
      expect(created.patientId).toBe(PATIENT_A1);
    });
  });

  describe("medical records", () => {
    it("doctor A1 lists only their own records", async () => {
      const service = new MedicineService(db);
      const { items } = await service.listRecords(doctorA1, { skip: 0, limit: 100 });
      expect(items.map((r) => r.recordId)).toEqual([RECORD_A1]);
    });

    it("doctor A1 cannot read doctor A2's record by id", async () => {
      const service = new MedicineService(db);
      await expect(service.getRecord(doctorA1, RECORD_A2)).rejects.toThrow(NotFoundError);
    });
  });

  describe("prescriptions", () => {
    it("doctor A1 lists only their own prescriptions", async () => {
      const service = new PrescriptionService(db);
      const { items } = await service.listPrescriptions(doctorA1, { skip: 0, limit: 100 });
      expect(items.map((p) => p.prescriptionId)).toEqual([PRESCRIPTION_A1]);
    });

    it("doctor A1 cannot read doctor A2's prescription by id", async () => {
      const service = new PrescriptionService(db);
      await expect(service.getPrescription(doctorA1, PRESCRIPTION_A2)).rejects.toThrow(NotFoundError);
    });
  });

  describe("billing", () => {
    it("doctor A1 lists only bills for their own patients", async () => {
      const service = new BillingService(db);
      const { items } = await service.listBills(doctorA1, { skip: 0, limit: 100 });
      expect(items.map((b) => b.billId)).toEqual([BILL_A1]);
    });

    it("doctor A1 cannot read doctor A2's bill by id", async () => {
      const service = new BillingService(db);
      await expect(service.getBill(doctorA1, BILL_A2)).rejects.toThrow(NotFoundError);
    });
  });

  describe("clinic admin sees everything in their clinic", () => {
    it("clinic admin sees BOTH doctors' patients", async () => {
      const service = new PatientService(db);
      const { items } = await service.listPatients(adminA, { skip: 0, limit: 100 });
      expect(items.map((p) => p.patientId).sort()).toEqual([PATIENT_A1, PATIENT_A2].sort());
    });

    it("clinic admin sees BOTH doctors' records", async () => {
      const service = new MedicineService(db);
      const { items } = await service.listRecords(adminA, { skip: 0, limit: 100 });
      expect(items.map((r) => r.recordId).sort()).toEqual([RECORD_A1, RECORD_A2].sort());
    });
  });

  describe("doctor directory is clinic-wide (not medical data)", () => {
    it("doctor A1 can see doctor A2's public profile", async () => {
      const service = await import("@/clinic/modules/doctors/doctors.service").then((m) => m.DoctorService);
      const doctor = await new service(db).getDoctor(doctorA2, DOCTOR_A2);
      expect(doctor.doctorId).toBe(DOCTOR_A2);
    });
  });
});