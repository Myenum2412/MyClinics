export const ROLES = ["doctor", "receptionist", "patient"] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ["doctor", "receptionist"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role?: string | null): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

export function canAccessBilling(role?: string | null): boolean {
  return !isStaffRole(role) && role !== "patient";
}
