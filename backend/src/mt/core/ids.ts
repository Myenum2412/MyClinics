import { randomBytes } from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Cryptographically random base62 string of `length` chars. */
export function randomToken(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE62[bytes[i] % BASE62.length];
  }
  return out;
}

/**
 * Public clinic identifier generated at signup, e.g. `clc_8Kd3mQx9zT2wR6sB4vYc`.
 * This is the tenant key stamped onto every document in the system.
 */
export function generateClinicId(): string {
  return `clc_${randomToken(20)}`;
}

/** Public user identifier, e.g. `usr_a1B2c3D4e5F6`. */
export function generateUserId(): string {
  return `usr_${randomToken(12)}`;
}

/** Public session/refresh identifier, e.g. `ses_...`. */
export function generateSessionId(): string {
  return `ses_${randomToken(24)}`;
}

/** Slugified clinic name for URLs, e.g. "sunrise-family-clinic". */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || `clinic-${randomToken(6).toLowerCase()}`;
}

/** Normalizes an email: trimmed, lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
