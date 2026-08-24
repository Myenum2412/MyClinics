import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { nowMs } from "@/clinic/core/datetime";
import { isClinicRole, type ClinicRole } from "@/clinic/core/roles";

/**
 * JWT strategy for the clinic (multi-tenant) API.
 *
 * Claims:
 *   sub       – user id
 *   clinicId  – tenant id (root of all scoping; null for platform_admin)
 *   role      – platform_admin | clinic_admin | doctor | staff | patient
 *   doctorId  – linked doctor record id (doctor role)
 *   patientId – linked patient record id (patient role)
 *   jti       – unique token id (audit/revocation)
 *
 * Secret resolution: CLINIC_JWT_SECRET, falling back to AUTH_SECRET. The
 * server fails closed (sign/verify throw) when neither is configured.
 */

const ISSUER = "myclinics-clinic";
const AUDIENCE = "myclinics-clinic-client";

export const CLINIC_ID_PREFIX = "clc_";

export interface ClinicTokenPayload {
  userId: string;
  clinicId: string | null;
  role: ClinicRole;
  name: string | null;
  email: string | null;
  doctorId: string | null;
  patientId: string | null;
}

function resolveSecret(): string {
  const secret = process.env.CLINIC_JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "CLINIC_JWT_SECRET (or AUTH_SECRET) must be configured with at least 16 characters"
    );
  }
  return secret;
}

export function accessTokenTtlSeconds(): number {
  const hours = Number(process.env.CLINIC_JWT_TTL_HOURS ?? 24);
  const safe = Number.isFinite(hours) && hours > 0 ? hours : 24;
  return Math.round(safe * 3600);
}

export async function signClinicToken(
  payload: ClinicTokenPayload
): Promise<string> {
  const secret = resolveSecret();
  return new SignJWT({
    clinicId: payload.clinicId,
    role: payload.role,
    name: payload.name,
    email: payload.email,
    doctorId: payload.doctorId,
    patientId: payload.patientId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(randomBytes(16).toString("hex"))
    .setIssuedAt()
    .setExpirationTime(Math.floor(nowMs() / 1000) + accessTokenTtlSeconds())
    .sign(new TextEncoder().encode(secret));
}

export interface VerifiedClinicToken extends ClinicTokenPayload {
  jti: string;
  issuedAt: number;
  expiresAt: number;
}

export async function verifyClinicToken(token: string): Promise<VerifiedClinicToken> {
  const secret = resolveSecret();
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const userId = payload.sub;
  const role = payload.role;
  if (!userId || !isClinicRole(role)) {
    throw new Error("Malformed clinic token claims");
  }
  const clinicId = typeof payload.clinicId === "string" ? payload.clinicId : null;
  if (role !== "platform_admin" && !isValidClinicId(clinicId)) {
    throw new Error("Malformed clinic token claims");
  }

  return {
    userId,
    clinicId,
    role,
    name: typeof payload.name === "string" ? payload.name : null,
    email: typeof payload.email === "string" ? payload.email : null,
    doctorId: typeof payload.doctorId === "string" ? payload.doctorId : null,
    patientId: typeof payload.patientId === "string" ? payload.patientId : null,
    jti: typeof payload.jti === "string" ? payload.jti : "",
    issuedAt: payload.iat ?? 0,
    expiresAt: payload.exp ?? 0,
  };
}

export function isValidClinicId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(CLINIC_ID_PREFIX) &&
    value.length > 4
  );
}

export function isValidEntityId(value: unknown, prefix: string): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(prefix) &&
    value.length > prefix.length + 4
  );
}
