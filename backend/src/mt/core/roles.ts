/**
 * Multi-tenant role model. Hierarchy (highest first):
 *
 *   clinic_admin  – full control over the clinic tenant
 *   staff         – manage clinical data of the tenant
 *   patient       – only ever their own records
 *
 * The role is embedded in the JWT at login and re-validated against the
 * database on every request by the tenant-scope middleware.
 */

export const MT_ROLES = ["clinic_admin", "staff", "patient"] as const;
export type MtRole = (typeof MT_ROLES)[number];

export const MT_STAFF_ROLES = ["clinic_admin", "staff"] as const;
export type MtStaffRole = (typeof MT_STAFF_ROLES)[number];

export const ROLE_PRIORITY: Record<MtRole, number> = {
  clinic_admin: 3,
  staff: 2,
  patient: 1,
};

export function isMtRole(value: unknown): value is MtRole {
  return typeof value === "string" && (MT_ROLES as readonly string[]).includes(value);
}

export function isStaffRoleMt(role: MtRole): boolean {
  return ROLE_PRIORITY[role] >= ROLE_PRIORITY.staff;
}

/** True when `role` is at least as privileged as `minimum`. */
export function hasRoleAtLeast(role: MtRole, minimum: MtRole): boolean {
  return ROLE_PRIORITY[role] >= ROLE_PRIORITY[minimum];
}

/** Human-readable role label. */
export const ROLE_LABELS: Record<MtRole, string> = {
  clinic_admin: "Clinic Admin",
  staff: "Staff",
  patient: "Patient",
};
