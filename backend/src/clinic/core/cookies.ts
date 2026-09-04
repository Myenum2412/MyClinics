import type { FastifyReply } from "fastify";
import { randomBytes } from "node:crypto";

export const CLINIC_TOKEN_COOKIE = "clinic_token";
export const CSRF_COOKIE = "clinic_csrf";

function isSecureRequest(isProduction: boolean): boolean {
  // In production we always set Secure (TLS). In dev allow http for localhost.
  return isProduction;
}

/**
 * Sets the clinic JWT as an httpOnly, Secure, SameSite cookie.
 * Also sets a non-httpOnly CSRF token cookie for double-submit protection
 * on mutating requests that rely on cookies (Authorization header bypasses CSRF).
 */
export function setClinicAuthCookies(
  reply: FastifyReply,
  token: string,
  ttlSeconds: number
): void {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isSecureRequest(isProd);
  // Derive cookie domain for cross-subdomain sharing in prod (api.myclinic.myenum.in ↔ myclinic.myenum.in)
  // Only set Domain when the request host is a myenum domain and we are in prod.
  const domain = isProd ? ".myenum.in" : undefined;

  void reply.setCookie(CLINIC_TOKEN_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: ttlSeconds,
    domain,
  });

  // CSRF double-submit cookie (readable by JS, but not the auth token)
  const csrfToken = generateCsrfToken();
  void reply.setCookie(CSRF_COOKIE, csrfToken, {
    path: "/",
    httpOnly: false,
    secure,
    sameSite: "lax",
    maxAge: ttlSeconds,
    domain,
  });
}

export function clearClinicAuthCookies(reply: FastifyReply): void {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isSecureRequest(isProd);
  const domain = isProd ? ".myenum.in" : undefined;
  void reply.clearCookie(CLINIC_TOKEN_COOKIE, { path: "/", domain, secure, sameSite: "lax" });
  void reply.clearCookie(CSRF_COOKIE, { path: "/", domain, secure, sameSite: "lax" });
}

function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Validates CSRF for state-changing requests when cookie auth is used without Authorization.
 * If Authorization bearer is present, CSRF is not required (not a cookie-auto auth).
 */
export function isCsrfValid(request: { headers: Record<string, unknown>; cookies?: Record<string, string> }): boolean {
  const auth = request.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return true; // header auth bypasses CSRF
  const method = (request.headers[":method"] as string) ?? (request as unknown as { method?: string }).method ?? "GET";
  const upper = method.toUpperCase();
  if (upper === "GET" || upper === "HEAD" || upper === "OPTIONS") return true;
  const csrfCookie = (request as unknown as { cookies?: Record<string, string> }).cookies?.[CSRF_COOKIE];
  const csrfHeader = request.headers["x-csrf-token"] as string | undefined;
  if (!csrfCookie || !csrfHeader) return false;
  return csrfCookie === csrfHeader;
}
