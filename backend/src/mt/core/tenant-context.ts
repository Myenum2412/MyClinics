import type { MtRole } from "@/mt/core/roles";
import type { FastifyRequest } from "fastify";

/**
 * The tenant context every multi-tenant handler receives. It is derived from
 * the verified JWT and refreshed against the database by the tenant-scope
 * middleware. Handlers MUST never derive clinicId from the request body or
 * params — only from this context.
 */
export interface TenantContext {
  userId: string;
  clinicId: string;
  role: MtRole;
  name: string | null;
  email: string | null;
  /** Present for `patient` role: the patient record id owned by this user. */
  patientId: string | null;
  /** JWT id — used for audit correlation. */
  tokenId: string;
  /** Source IP of the request, for audit trails. */
  ip: string | null;
  userAgent: string | null;
}

export function isStaffContext(ctx: TenantContext): boolean {
  return ctx.role === "clinic_admin" || ctx.role === "staff";
}

export function isAdminContext(ctx: TenantContext): boolean {
  return ctx.role === "clinic_admin";
}

declare module "fastify" {
  interface FastifyRequest {
    /** Tenant context, set by the tenant-scope middleware. Null outside it. */
    tenant: TenantContext | null;
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
