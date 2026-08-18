import { randomBytes } from "node:crypto";

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

const pendingStates = new Map<string, number>();

export function issueStateToken(): string {
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, Date.now() + STATE_TTL_MS);
  if (pendingStates.size > 1000) {
    const now = Date.now();
    for (const [key, exp] of pendingStates) {
      if (exp < now) pendingStates.delete(key);
    }
  }
  return state;
}

export function consumeStateToken(state: string): boolean {
  const exp = pendingStates.get(state);
  if (!exp) return false;
  pendingStates.delete(state);
  return exp >= Date.now();
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