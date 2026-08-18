/**
 * Multi-tenant role model. Hierarchy (highest first):
 *
 *   platform_admin – platform-wide control over every clinic (no clinicId)
 *   clinic_admin   – full control over a single clinic tenant
 *   doctor         – clinical staff: only own patients / own clinical data
 *   staff          – non-clinical staff: clinic-wide non-clinical data
 *   patient        – only ever their own records
 *
 * The role is embedded in the JWT at login and re-validated against the
 * database on every request by the clinic-scope middleware.
 */

export const CLINIC_ROLES = [
  "platform_admin",
  "clinic_admin",
  "doctor",
  "staff",
  "patient",
] as const;
export type ClinicRole = (typeof CLINIC_ROLES)[number];

export const CLINIC_STAFF_ROLES = ["clinic_admin", "doctor", "staff"] as const;
export type ClinicStaffRole = (typeof CLINIC_STAFF_ROLES)[number];

export const ROLE_PRIORITY: Record<ClinicRole, number> = {
  platform_admin: 5,
  clinic_admin: 4,
  doctor: 3,
  staff: 2,
  patient: 1,
};

export function isClinicRole(value: unknown): value is ClinicRole {
  return (
    typeof value === "string" && (CLINIC_ROLES as readonly string[]).includes(value)
  );
}

/** Roles that belong to a clinic tenant (platform_admin is outside any clinic). */
export function isTenantRole(role: ClinicRole): boolean {
  return role !== "platform_admin";
}

export function isStaffRole(role: ClinicRole): boolean {
  return ROLE_PRIORITY[role] >= ROLE_PRIORITY.staff;
}

export function isClinicalStaff(role: ClinicRole): boolean {
  return role === "clinic_admin" || role === "doctor";
}

/** True when `role` is at least as privileged as `minimum`. */
export function hasRoleAtLeast(role: ClinicRole, minimum: ClinicRole): boolean {
  return ROLE_PRIORITY[role] >= ROLE_PRIORITY[minimum];
}

/** Human-readable role label. */
export const ROLE_LABELS: Record<ClinicRole, string> = {
  platform_admin: "Platform Admin",
  clinic_admin: "Clinic Admin",
  doctor: "Doctor",
  staff: "Staff",
  patient: "Patient",
};
