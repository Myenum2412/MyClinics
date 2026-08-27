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
  "pharmacy_manager",
  "doctor",
  "pharmacist",
  "inventory_staff",
  "billing_staff",
  "staff",
  "patient",
] as const;
export type ClinicRole = (typeof CLINIC_ROLES)[number];

export const CLINIC_STAFF_ROLES = ["clinic_admin", "doctor", "staff"] as const;
export type ClinicStaffRole = (typeof CLINIC_STAFF_ROLES)[number];

/** Pharmacy-specific roles introduced by the Pharmacy Management module. */
export const PHARMACY_ROLES = [
  "pharmacy_manager",
  "pharmacist",
  "inventory_staff",
  "billing_staff",
] as const;
export type PharmacyRole = (typeof PHARMACY_ROLES)[number];

export function isPharmacyRole(role: unknown): role is PharmacyRole {
  return (
    typeof role === "string" && (PHARMACY_ROLES as readonly string[]).includes(role)
  );
}

export const ROLE_PRIORITY: Record<ClinicRole, number> = {
  platform_admin: 7,
  clinic_admin: 6,
  pharmacy_manager: 5,
  doctor: 4,
  pharmacist: 3,
  inventory_staff: 3,
  billing_staff: 3,
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
  pharmacy_manager: "Pharmacy Manager",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  inventory_staff: "Inventory Staff",
  billing_staff: "Billing Staff",
  staff: "Staff",
  patient: "Patient",
};
