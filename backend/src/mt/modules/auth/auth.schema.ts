import type { MtRole } from "@/mt/core/roles";

/** A clinic — one tenant. Every other collection is stamped with its clinicId. */
export interface ClinicDoc {
  clinicId: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  status: "active" | "suspended" | "deleted";
  plan: "free" | "pro" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

export interface MtUserDoc {
  _id?: unknown;
  clinicId: string;
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: MtRole;
  /** Patient record id — set when role === "patient". */
  patientId: string | null;
  phone: string | null;
  status: "active" | "inactive";
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}