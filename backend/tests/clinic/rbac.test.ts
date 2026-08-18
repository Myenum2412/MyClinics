import { describe, expect, it } from "vitest";
import { can, MODULE_POLICY, type ClinicModule } from "@/clinic/core/permissions";
import { hasRoleAtLeast, isStaffRole, ROLE_PRIORITY } from "@/clinic/core/roles";
import { requireRoles } from "@/clinic/core/scope";
import {
  adminA,
  doctorA1,
  patientA1,
  staffA,
} from "./helpers/fixtures";

const ROLES = ["platform_admin", "clinic_admin", "doctor", "staff", "patient"] as const;

describe("Role hierarchy", () => {
  it("priority order is platform > admin > doctor > staff > patient", () => {
    expect(ROLE_PRIORITY.platform_admin).toBeGreaterThan(ROLE_PRIORITY.clinic_admin);
    expect(ROLE_PRIORITY.clinic_admin).toBeGreaterThan(ROLE_PRIORITY.doctor);
    expect(ROLE_PRIORITY.doctor).toBeGreaterThan(ROLE_PRIORITY.staff);
    expect(ROLE_PRIORITY.staff).toBeGreaterThan(ROLE_PRIORITY.patient);
  });

  it("hasRoleAtLeast respects the hierarchy", () => {
    expect(hasRoleAtLeast("clinic_admin", "staff")).toBe(true);
    expect(hasRoleAtLeast("doctor", "staff")).toBe(true);
    expect(hasRoleAtLeast("staff", "doctor")).toBe(false);
    expect(hasRoleAtLeast("patient", "patient")).toBe(true);
  });

  it("isStaffRole excludes patients", () => {
    expect(isStaffRole("clinic_admin")).toBe(true);
    expect(isStaffRole("doctor")).toBe(true);
    expect(isStaffRole("staff")).toBe(true);
    expect(isStaffRole("patient")).toBe(false);
  });
});

describe("Permission matrix", () => {
  it("patients: read requires doctor+; delete requires clinic_admin", () => {
    expect(can("clinic_admin", "patients", "read")).toBe(true);
    expect(can("doctor", "patients", "read")).toBe(true);
    expect(can("staff", "patients", "read")).toBe(false); // staff has no clinical read
    expect(can("patient", "patients", "delete")).toBe(false);
    expect(can("staff", "patients", "delete")).toBe(false);
    expect(can("clinic_admin", "patients", "delete")).toBe(true);
  });

  it("medical-records: create/edit is clinical-only (doctor+); staff forbidden", () => {
    expect(can("doctor", "medical-records", "create")).toBe(true);
    expect(can("staff", "medical-records", "create")).toBe(false);
    expect(can("patient", "medical-records", "create")).toBe(false);
    expect(can("clinic_admin", "medical-records", "create")).toBe(true);
  });

  it("billing: staff can manage; patients cannot (portal-only read)", () => {
    expect(can("staff", "billing", "create")).toBe(true);
    expect(can("doctor", "billing", "read")).toBe(true);
    expect(can("patient", "billing", "read")).toBe(false); // via /me/bills portal, not module routes
    expect(can("patient", "billing", "create")).toBe(false);
  });

  it("patient portal is the patient's only data path — module list/read stays staff+/doctor+", () => {
    expect(can("patient", "appointments", "list")).toBe(false);
    expect(can("patient", "medical-records", "list")).toBe(false);
    expect(can("patient", "prescriptions", "list")).toBe(false);
    expect(can("patient", "reports", "list")).toBe(false);
    // doctors may read clinical data, staff never can
    expect(can("staff", "medical-records", "read")).toBe(false);
    expect(can("doctor", "medical-records", "read")).toBe(true);
  });

  it("clinics: platform_admin only", () => {
    for (const role of ROLES) {
      expect(can(role, "clinics", "manage"), role).toBe(role === "platform_admin");
    }
  });

  it("users: clinic_admin only", () => {
    expect(can("clinic_admin", "users", "manage")).toBe(true);
    expect(can("doctor", "users", "manage")).toBe(false);
    expect(can("staff", "users", "manage")).toBe(false);
  });

  it("audit-logs: clinic_admin only", () => {
    expect(can("clinic_admin", "audit-logs", "list")).toBe(true);
    expect(can("doctor", "audit-logs", "list")).toBe(false);
    expect(can("staff", "audit-logs", "list")).toBe(false);
  });

  it("every module has a policy for every action", () => {
    const actions = ["list", "read", "create", "update", "delete", "manage"] as const;
    for (const module of Object.keys(MODULE_POLICY) as ClinicModule[]) {
      for (const action of actions) {
        expect(MODULE_POLICY[module][action], `${module}.${action}`).toBeDefined();
      }
    }
  });
});

describe("requireRoles guard", () => {
  function makeRequest(ctx: unknown): never {
    return { clinic: ctx } as never;
  }

  it("doctor passes requireRoles('doctor')", async () => {
    const guard = requireRoles("doctor");
    await expect(guard(makeRequest(doctorA1), {} as never)).resolves.toBeUndefined();
  });

  it("staff FAILS requireRoles('doctor') — staff cannot touch clinical modules", async () => {
    const guard = requireRoles("doctor");
    await expect(guard(makeRequest(staffA), {} as never)).rejects.toThrow();
  });

  it("clinic_admin passes requireRoles('doctor') via hierarchy", async () => {
    const guard = requireRoles("doctor");
    await expect(guard(makeRequest(adminA), {} as never)).resolves.toBeUndefined();
  });

  it("patient fails requireRoles('staff')", async () => {
    const guard = requireRoles("staff");
    await expect(guard(makeRequest(patientA1), {} as never)).rejects.toThrow();
  });

  it("patient passes requireRoles('patient')", async () => {
    const guard = requireRoles("patient");
    await expect(guard(makeRequest(patientA1), {} as never)).resolves.toBeUndefined();
  });

  it("rejects when no tenant context is present", async () => {
    const guard = requireRoles("staff");
    await expect(guard({ clinic: null } as never, {} as never)).rejects.toThrow();
  });
});