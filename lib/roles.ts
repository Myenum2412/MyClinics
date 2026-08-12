export const ROLES = ["doctor", "staff", "patient"] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ["doctor", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const LEGACY_STAFF_ROLES = ["receptionist"] as const;

const STAFF_ROLE_LOOKUP: readonly string[] = [
  ...STAFF_ROLES,
  ...LEGACY_STAFF_ROLES,
];

export function isStaffRole(role?: string | null): boolean {
  return !!role && STAFF_ROLE_LOOKUP.includes(role);
}

export function canAccessBilling(role?: string | null): boolean {
  return isStaffRole(role);
}
