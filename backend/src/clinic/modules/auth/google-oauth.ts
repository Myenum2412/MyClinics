import { randomBytes } from "node:crypto";
import { nowMs } from "@/clinic/core/datetime";

/**
 * Google OAuth (authorization code flow) for clinic sign-in.
 *
 * Flow: the login page links to `GET /api/clinics/auth/google`, which
 * redirects to Google. Google redirects back to
 * `GET /api/clinics/auth/google/callback`, the backend exchanges the code
 * for tokens, resolves the verified email, and redirects to the login page
 * with `?google_token=...` — which the client stores and uses like any
 * other session token.
 *
 * Account linking is by verified email: a Google sign-in succeeds only when
 * a `clc_users` account already exists with the same email (and the user /
 * clinic are active). No accounts are auto-created.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const STATE_TTL_MS = 10 * 60 * 1000;

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

interface GoogleTokens {
  access_token: string;
  expires_in?: number;
}

export function googleConfig(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** Public base URL of the frontend (what Google redirects the browser to). */
export function frontendBaseUrl(request: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const host = request.headers.host;
  return `${proto === "https" ? "https" : "http"}://${host ?? "localhost:3456"}`;
}

// ── One-time state tokens (CSRF protection) ────────────────────────────────

const pendingStates = new Map<string, { exp: number; from: "login" | "signup" }>();

export function issueStateToken(from: "login" | "signup" = "login"): string {
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, { exp: nowMs() + STATE_TTL_MS, from });
  if (pendingStates.size > 1000) {
    const now = nowMs();
    for (const [key, entry] of pendingStates) {
      if (entry.exp < now) pendingStates.delete(key);
    }
  }
  return state;
}

/** Returns the flow origin ("login" | "signup") the state was issued for, or null. */
export function consumeStateToken(state: string): "login" | "signup" | null {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  return entry.exp >= nowMs() ? entry.from : null;
}

// ── One-time Google signup tickets ─────────────────────────────────────────
// A passwordless clinic can only be created for an email Google actually
// verified. The OAuth callback (which sees the verified email) mints a
// short-lived, single-use ticket; the client submits it back with the
// signup request and the backend maps it to the email.

const signupTickets = new Map<string, { exp: number; email: string }>();

export function issueGoogleSignupTicket(email: string): string {
  const ticket = randomBytes(24).toString("hex");
  signupTickets.set(ticket, { exp: nowMs() + STATE_TTL_MS, email });
  return ticket;
}

/** Returns the verified email the ticket was minted for, or null. */
export function consumeGoogleSignupTicket(ticket: string): string | null {
  const entry = signupTickets.get(ticket);
  if (!entry) return null;
  signupTickets.delete(ticket);
  return entry.exp >= nowMs() ? entry.email : null;
}

// ── Google calls ───────────────────────────────────────────────────────────

export function buildAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status})`);
  }
  const data = (await res.json()) as GoogleTokens & { error?: string };
  if (!data.access_token) {
    throw new Error(data.error ?? "Google token exchange failed");
  }
  return data;
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo failed (${res.status})`);
  }
  return (await res.json()) as GoogleUserInfo;
}