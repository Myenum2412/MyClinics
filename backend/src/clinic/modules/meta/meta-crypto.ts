import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * Encryption helper for Meta integration secrets (long-lived access tokens,
 * page access tokens). Tokens are encrypted at rest with AES-256-GCM and are
 * NEVER returned to the frontend. The key is derived from META_TOKEN_SECRET
 * (falling back to AUTH_SECRET / CLINIC_JWT_SECRET); the server fails closed
 * if none is configured.
 */

const ALGO = "aes-256-gcm";

function resolveKey(): Buffer {
  const secret =
    process.env.META_TOKEN_SECRET ||
    process.env.CLINIC_JWT_SECRET ||
    process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "META_TOKEN_SECRET (or CLINIC_JWT_SECRET/AUTH_SECRET) must be configured to encrypt Meta tokens"
    );
  }
  // Derive a 32-byte key deterministically from the secret.
  return createHash32(secret);
}

function createHash32(input: string): Buffer {
  return createHash("sha256").update(input).digest();
}

export interface EncryptedPayload {
  /** Opaque reference id kept in the DB instead of the token itself. */
  reference: string;
  /** base64(iv | authTag | ciphertext). */
  ciphertext: string;
}

export function encryptToken(plaintext: string): EncryptedPayload {
  const key = resolveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return { reference: randomBytes(16).toString("base64url"), ciphertext: packed };
}

export function decryptToken(payload: EncryptedPayload): string {
  const key = resolveKey();
  const packed = Buffer.from(payload.ciphertext, "base64");
  const iv = packed.subarray(0, 12);
  const authTag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** True when a plaintext token should be considered expired. */
export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}
