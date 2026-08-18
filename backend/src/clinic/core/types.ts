import type { ClinicRole } from "@/clinic/core/roles";
import type { ClinicDocument } from "@/clinic/core/repository";

/**
 * Shared domain documents used across modules (auth, clinics, users).
 * `clinicId` is `string | null` here because the users collection also
 * holds platform_admin accounts (no tenant); the repository rejects null
 * clinicIds at runtime for all clinic-scoped operations.
 */

export interface ClinicDoc extends ClinicDocument {
  clinicId: string;
  slug: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  status: "active" | "suspended" | "deleted";
  settings: {
    workingHours: { open: string; close: string };
    slotMinutes: number;
    currency: string;
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserDoc extends ClinicDocument {
  /** null only for platform_admin. */
  clinicId: string | null;
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: ClinicRole;
  doctorId: string | null;
  staffId: string | null;
  patientId: string | null;
  phone: string | null;
  status: "active" | "inactive" | "deleted";
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
