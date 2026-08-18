import { describe, expect, it } from "vitest";
import { NotFoundError, UnauthorizedError } from "@/clinic/core/errors";
import { allowStaffOrOwnPatient, requireClinicAccess } from "@/clinic/core/scope";
import { AppointmentService } from "@/clinic/modules/appointments/appointments.service";
import { PatientService } from "@/clinic/modules/patients/patients.service";
import {
  adminA,
  CLINIC_A,
  CLINIC_B,
  doctorA1,
  patientA1,
  patientB1,
  PATIENT_A2,
  PATIENT_B1,
  seedIsolationDb,
} from "./helpers/fixtures";

type FakeRequest = {
  clinic: unknown;
  params: Record<string, string | undefined>;
};

function makeRequest(ctx: unknown, params: Record<string, string> = {}): FakeRequest {
  return { clinic: ctx, params };
}

const reply = {} as never;

/**
 * IDOR suite — a user must NEVER be able to reach another tenant's data by
 * tampering with URL ids. All boundary failures must be NotFound (404), so
 * tenants cannot even probe for each other's existence.
 */
describe("IDOR — URL clinicId tampering", () => {
  it("clinic A admin requesting clinic B's URL path gets 404", async () => {
    await expect(requireClinicAccess(makeRequest(adminA, { clinicId: CLINIC_B }) as never, reply)).rejects.toThrow(NotFoundError);
  });

  it("clinic A admin requesting their own clinic's URL passes", async () => {
    await expect(requireClinicAccess(makeRequest(adminA, { clinicId: CLINIC_A }) as never, reply)).resolves.toBeUndefined();
  });

  it("malformed clinicId in URL gets 404, not 500", async () => {
    await expect(requireClinicAccess(makeRequest(adminA, { clinicId: "clc_evil" }) as never, reply)).rejects.toThrow(NotFoundError);
  });

  it("missing clinicId param gets 404", async () => {
    await expect(requireClinicAccess(makeRequest(adminA, {}) as never, reply)).rejects.toThrow(NotFoundError);
  });

  it("no authenticated context gets 401", async () => {
    await expect(requireClinicAccess(makeRequest(null, { clinicId: CLINIC_A }) as never, reply)).rejects.toThrow(UnauthorizedError);
  });

  it("platform_admin may access any clinic's URL path", async () => {
    const platform = { ...adminA, role: "platform_admin" as const, clinicId: null };
    await expect(requireClinicAccess(makeRequest(platform, { clinicId: CLINIC_B }) as never, reply)).resolves.toBeUndefined();
  });
});

describe("IDOR — patientId tampering", () => {
  it("patient A1 requesting patient A2's patientId gets 404", async () => {
    await expect(allowStaffOrOwnPatient(makeRequest(patientA1, { patientId: PATIENT_A2 }) as never, reply)).rejects.toThrow(NotFoundError);
  });

  it("patient A1 requesting their own patientId passes", async () => {
    await expect(allowStaffOrOwnPatient(makeRequest(patientA1, { patientId: "pat_a1aaaaaaaaaaaaa" }) as never, reply)).resolves.toBeUndefined();
  });

  it("patient A1 requesting patient B1's patientId gets 404", async () => {
    await expect(allowStaffOrOwnPatient(makeRequest(patientA1, { patientId: PATIENT_B1 }) as never, reply)).rejects.toThrow(NotFoundError);
  });
});

describe("IDOR — service-level cross-tenant writes", () => {
  const { db, dump } = seedIsolationDb();

  it("clinic A admin cannot create a patient that lands in clinic B", async () => {
    const service = new PatientService(db);
    const created = await service.createPatient(adminA, {
      fullName: "Sneaky",
      mobile: "9111111111",
      doctorId: null,
      // body includes a clinicId field — must be ignored/rejected
    } as never);
    expect(created.clinicId).toBe(CLINIC_A);
    expect(dump("clc_patients").some((p) => p.clinicId === CLINIC_B && p.fullName === "Sneaky")).toBe(false);
  });

  it("clinic A admin cannot delete clinic B's patient", async () => {
    const service = new PatientService(db);
    await expect(service.deletePatient(adminA, PATIENT_B1)).rejects.toThrow(NotFoundError);
    expect(dump("clc_patients").some((p) => p.patientId === PATIENT_B1 && p.status !== "deleted")).toBe(true);
  });

  it("doctor A1 cannot create an appointment for clinic B's patient", async () => {
    const service = new AppointmentService(db);
    await expect(
      service.createAppointment(doctorA1, {
        patientId: PATIENT_B1,
        doctorId: "doc_b1aaaaaaaaaaaaa",
        date: "2026-03-01",
        time: "10:00",
      })
    ).rejects.toThrow();
    // No NEW appointment for the cross-clinic patient may exist in clinic A
    expect(dump("clc_appointments").some((a) => a.patientId === PATIENT_B1 && a.clinicId === CLINIC_A)).toBe(false);
    expect(dump("clc_appointments").length).toBe(3); // seed untouched
  });

  it("clinic B patient cannot read clinic A patient data via the patient service", async () => {
    const service = new PatientService(db);
    await expect(service.getPatientById(patientB1, "pat_a1aaaaaaaaaaaaa")).rejects.toThrow(NotFoundError);
  });
});