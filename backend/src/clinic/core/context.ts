import type { ClinicRole } from "@/clinic/core/roles";
import type { FastifyRequest } from "fastify";

/**
 * The tenant context every clinic handler receives. It is derived from the
 * verified JWT and refreshed against the database by the clinic-scope
 * middleware. Handlers MUST never derive clinicId/doctorId from the request
 * body or params — only from this context (or an explicit, audited
 * authorization decision).
 */
export interface ClinicContext {
  userId: string;
  /** Tenant id; null only for platform_admin. */
  clinicId: string | null;
  role: ClinicRole;
  name: string | null;
  email: string | null;
  /** Present for `doctor` role: the doctor record id owned by this user. */
  doctorId: string | null;
  /** Present for `patient` role: the patient record id owned by this user. */
  patientId: string | null;
  /** JWT id — used for audit correlation. */
  tokenId: string;
  /** Source IP of the request, for audit trails. */
  ip: string | null;
  userAgent: string | null;
}

export function isStaffContext(ctx: ClinicContext): boolean {
  return ctx.role === "clinic_admin" || ctx.role === "staff" || ctx.role === "doctor";
}

export function isAdminContext(ctx: ClinicContext): boolean {
  return ctx.role === "clinic_admin";
}

export function isPlatformAdmin(ctx: ClinicContext): boolean {
  return ctx.role === "platform_admin";
}

export function requireClinicOf(ctx: ClinicContext): string {
  if (!ctx.clinicId) {
    throw new Error("platform_admin used a clinic-scoped resource without a clinicId");
  }
  return ctx.clinicId;
}

declare module "fastify" {
  interface FastifyRequest {
    /** Tenant context, set by the clinic-scope middleware. Null outside it. */
    clinic: ClinicContext | null;
  }
}

export function requestMeta(
  request: FastifyRequest
): { ip: string | null; userAgent: string | null } {
  const forwarded = request.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim()) ??
    request.ip ??
    null;
  const userAgent =
    typeof request.headers["user-agent"] === "string"
      ? request.headers["user-agent"].slice(0, 500)
      : null;
  return { ip, userAgent };
}
