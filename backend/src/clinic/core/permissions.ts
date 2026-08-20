/**
 * Central permission matrix for the clinic domain.
 *
 * Every module exposes a set of actions; every role maps to the actions it
 * may perform. Route guards use these helpers so policy lives in exactly
 * one place, enforced server-side at the route, service AND repository
 * layers.
 */
import {
  hasRoleAtLeast,
  type ClinicRole,
} from "@/clinic/core/roles";

export type ClinicModule =
  | "clinics"
  | "users"
  | "doctors"
  | "staff"
  | "patients"
  | "appointments"
  | "medicine"
  | "prescriptions"
  | "billing"
  | "settings"
  | "notifications"
  | "audit-logs";

export type ClinicAction =
  | "list"
  | "read"
  | "create"
  | "update"
  | "delete"
  | "manage";

/** Minimum role required for a module action (see ROLE_PRIORITY). */
export const MODULE_POLICY: Record<ClinicModule, Partial<Record<ClinicAction, ClinicRole>>> = {
  clinics: {
    list: "platform_admin",
    read: "platform_admin",
    create: "platform_admin",
    update: "platform_admin",
    delete: "platform_admin",
    manage: "platform_admin",
  },
  users: {
    list: "clinic_admin",
    read: "clinic_admin",
    create: "clinic_admin",
    update: "clinic_admin",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  doctors: {
    list: "doctor",
    read: "doctor",
    create: "clinic_admin",
    update: "clinic_admin",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  staff: {
    list: "staff",
    read: "staff",
    create: "clinic_admin",
    update: "clinic_admin",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  patients: {
    list: "doctor",
    read: "doctor",
    create: "staff",
    update: "staff",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  appointments: {
    list: "doctor",
    read: "doctor",
    create: "staff",
    update: "staff",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  medicine: {
    list: "doctor",
    read: "doctor",
    create: "doctor",
    update: "doctor",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  prescriptions: {
    list: "doctor",
    read: "doctor",
    create: "doctor",
    update: "doctor",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  billing: {
    list: "staff",
    read: "staff",
    create: "staff",
    update: "staff",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  settings: {
    list: "staff",
    read: "staff",
    create: "clinic_admin",
    update: "clinic_admin",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  notifications: {
    list: "patient",
    read: "patient",
    create: "staff",
    update: "patient",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
  "audit-logs": {
    list: "clinic_admin",
    read: "clinic_admin",
    create: "clinic_admin",
    update: "clinic_admin",
    delete: "clinic_admin",
    manage: "clinic_admin",
  },
};

/** Default minimum role for an action on a module. */
export function minimumRoleFor(module: ClinicModule, action: ClinicAction): ClinicRole | null {
  return MODULE_POLICY[module][action] ?? null;
}

/** True when `role` passes the module/action minimum. */
export function can(role: ClinicRole, module: ClinicModule, action: ClinicAction): boolean {
  const min = minimumRoleFor(module, action);
  if (!min) return false;
  return hasRoleAtLeast(role, min);
}

/**
 * Resource-level rule sets. These are layered on top of the module matrix:
 * a role may pass `can()` for a module yet be restricted to a subset of
 * records (e.g. a doctor may list patients, but only their own).
 */
export const RESOURCE_RULES = {
  /** Resources owned by a doctor (appointments, records, prescriptions). */
  doctorScoped: {
    doctor: "own",
    clinic_admin: "all",
    staff: "all",
    patient: "own",
    platform_admin: "all",
  } as const,
  /** Patient records: doctors see assigned patients, patients see themselves. */
  patientScoped: {
    doctor: "assigned",
    clinic_admin: "all",
    staff: "all",
    patient: "own",
    platform_admin: "all",
  } as const,
} as const;
