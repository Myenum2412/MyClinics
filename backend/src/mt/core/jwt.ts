import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { isMtRole, type MtRole } from "@/mt/core/roles";

/**
 * JWT strategy for the multi-tenant API.
 *
 * Claims:
 *   sub       – user id
 *   clinicId  – tenant id (root of all scoping)
 *   role      – clinic_admin | staff | patient
 *   patientId – patient record id (present when role === patient)
 *   jti       – unique token id (audit/revocation)
 *
 * Secret resolution: MT_JWT_SECRET, falling back to AUTH_SECRET. The server
 * fails closed (sign/verify throw) when neither is configured.
 */

const ISSUER = "myclinics-mt";
const AUDIENCE = "myclinics-mt-client";

export const CLINIC_ID_PREFIX = "clc_";

export interface TenantTokenPayload {
  userId: string;
  clinicId: string;
  role: MtRole;
  name: string | null;
  email: string | null;
  patientId: string | null;
}

function resolveSecret(): string {
  const secret = process.env.MT_JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "MT_JWT_SECRET (or AUTH_SECRET) must be configured with at least 16 characters"
    );
  }
  return secret;
}

export function accessTokenTtlSeconds(): number {
  const hours = Number(process.env.MT_JWT_TTL_HOURS ?? 24);
  const safe = Number.isFinite(hours) && hours > 0 ? hours : 24;
  return Math.round(safe * 3600);
}

export async function signTenantToken(
  payload: TenantTokenPayload
): Promise<string> {
  const secret = resolveSecret();
  return new SignJWT({
    clinicId: payload.clinicId,
    role: payload.role,
    name: payload.name,
    email: payload.email,
    patientId: payload.patientId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(randomBytes(16).toString("hex"))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + accessTokenTtlSeconds())
    .sign(new TextEncoder().encode(secret));
}

export interface VerifiedToken extends TenantTokenPayload {
  jti: string;
  issuedAt: number;
  expiresAt: number;
}

export async function verifyTenantToken(token: string): Promise<VerifiedToken> {
  const secret = resolveSecret();
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const userId = payload.sub;
  const clinicId = payload.clinicId;
  const role = payload.role;
  if (!userId || typeof clinicId !== "string" || !isMtRole(role)) {
    throw new Error("Malformed tenant token claims");
  }

  return {
    userId,
    clinicId,
    role,
    name: typeof payload.name === "string" ? payload.name : null,
    email: typeof payload.email === "string" ? payload.email : null,
    patientId: typeof payload.patientId === "string" ? payload.patientId : null,
    jti: typeof payload.jti === "string" ? payload.jti : "",
    issuedAt: payload.iat ?? 0,
    expiresAt: payload.exp ?? 0,
  };
}

export function isValidClinicId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(CLINIC_ID_PREFIX) && value.length > 4;
}
