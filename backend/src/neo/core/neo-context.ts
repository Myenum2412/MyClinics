import type { ClinicContext } from "@/clinic/core/context";
import { ORGANIZATION_ID } from "@/neo/core/neo-events";

/**
 * RGB Neo operates at two scopes:
 *  - clinic scope: a specific clinicId (clinic_admin or platform_admin drilling in)
 *  - organization scope: clinicId is null, meaning "all clinics of the org"
 *    (only reachable by platform_admin through the guarded org routes).
 *
 * The resolved context always carries the organizationId so every document and
 * query stays multi-tenant.
 */
export interface NeoContext {
  organizationId: string;
  /** null === organization-wide scope (platform_admin only). */
  clinicId: string | null;
  role: ClinicContext["role"];
  actorId: string;
  ip: string | null;
  userAgent: string | null;
}

export function resolveNeoContext(ctx: ClinicContext | null): NeoContext {
  if (!ctx) {
    throw new Error("RGB Neo requires an authenticated context");
  }
  return {
    organizationId: ORGANIZATION_ID,
    clinicId: ctx.clinicId,
    role: ctx.role,
    actorId: ctx.userId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  };
}

/**
 * Builds a Mongo filter fragment from the scope. When a clinicId is present the
 * query is locked to that clinic; when null (platform_admin org scope) the
 * query covers every clinic in the organization. The organizationId is always
 * applied so a stale or forged clinicId can never leak another organization.
 */
export function scopeFilter(scope: NeoContext): { organizationId: string; clinicId?: string } {
  return scope.clinicId
    ? { organizationId: scope.organizationId, clinicId: scope.clinicId }
    : { organizationId: scope.organizationId };
}
