import { jwtDecrypt } from "jose";
import { hkdf } from "@panva/hkdf";

/**
 * Decodes a next-auth v5 JWT session cookie issued by the frontend.
 *
 * The frontend signs users in via next-auth (JWT strategy) and the backend
 * verifies those tokens independently using the shared AUTH_SECRET. The
 * cookie is a JWE (alg `dir`, enc `A256CBC-HS512`) whose key is derived via
 * HKDF-SHA256 with the session cookie name as salt — mirroring
 * `@auth/core/jwt` so no next-auth dependency is needed here.
 */
export interface SessionUser {
  id: string;
  role: string;
  name: string | null;
  email: string | null;
}

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

async function deriveKey(secret: string, salt: string): Promise<Uint8Array> {
  return hkdf("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
}

export function readSessionCookie(
  cookieHeader: string | undefined
): string | null {
  if (!cookieHeader) return null;
  for (const name of SESSION_COOKIES) {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
    );
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return null;
}

export async function decodeSessionToken(
  token: string,
  secret: string
): Promise<SessionUser | null> {
  for (const salt of SESSION_COOKIES) {
    try {
      const key = await deriveKey(secret, salt);
      const { payload } = await jwtDecrypt(token, key, {
        clockTolerance: 15,
        keyManagementAlgorithms: ["dir"],
        contentEncryptionAlgorithms: ["A256CBC-HS512", "A256GCM"],
      });
      if (!payload.sub) return null;
      return {
        id: String(payload.sub),
        role: String(payload.role ?? "patient"),
        name: payload.name ? String(payload.name) : null,
        email: payload.email ? String(payload.email) : null,
      };
    } catch {
      // try next salt
    }
  }
  return null;
}

/** Returns the session user for a request, or null when unauthenticated. */
export async function getSessionUser(
  cookieHeader: string | undefined
): Promise<SessionUser | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const token = readSessionCookie(cookieHeader);
  if (!token) return null;
  return decodeSessionToken(token, secret);
}