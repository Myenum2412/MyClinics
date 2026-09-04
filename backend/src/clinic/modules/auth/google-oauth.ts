import { randomBytes, createHash } from "node:crypto";
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
// SEC-014: persist to Mongo/Valkey for horizontal scale + PKCE. In-memory Map is fallback for tests.
const pendingStates = new Map<string, { exp: number; from: "login" | "signup"; verifier?: string }>();
const signupTickets = new Map<string, { exp: number; email: string }>();

async function persistState(state: string, from: "login" | "signup", verifier?: string): Promise<void> {
  try {
    const { getDb } = await import("@/lib/db-pools");
    const db = await getDb();
    await db.collection("clc_google_oauth_states").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    await db.collection("clc_google_oauth_states").insertOne({ state, from, verifier: verifier ?? null, expiresAt: new Date(nowMs() + STATE_TTL_MS), createdAt: new Date() });
  } catch {}
}
async function fetchAndDeleteState(state: string): Promise<{ from: "login" | "signup"; verifier?: string } | null> {
  try {
    const { getDb } = await import("@/lib/db-pools");
    const db = await getDb();
    const doc = await db.collection("clc_google_oauth_states").findOneAndDelete({ state });
    if (doc) {
      if ((doc.expiresAt as Date).getTime() >= nowMs()) return { from: doc.from, verifier: doc.verifier ?? undefined };
      return null;
    }
  } catch {}
  return null;
}

export async function issueStateToken(from: "login" | "signup" = "login"): Promise<string> {
  const state = randomBytes(24).toString("hex");
  // PKCE verifier
  const verifier = randomBytes(32).toString("hex");
  pendingStates.set(state, { exp: nowMs() + STATE_TTL_MS, from, verifier });
  if (pendingStates.size > 1000) {
    const now = nowMs();
    for (const [key, entry] of pendingStates) {
      if (entry.exp < now) pendingStates.delete(key);
    }
  }
  await persistState(state, from, verifier);
  return state;
}

/** Returns the flow origin ("login" | "signup") the state was issued for, or null. */
export async function consumeStateToken(state: string): Promise<"login" | "signup" | null> {
  // Prefer DB, fallback to memory
  const dbRes = await fetchAndDeleteState(state);
  if (dbRes) return dbRes.from;
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  return entry.exp >= nowMs() ? entry.from : null;
}

export async function consumeStateWithVerifier(state: string): Promise<{ from: "login" | "signup"; verifier?: string } | null> {
  const dbRes = await fetchAndDeleteState(state);
  if (dbRes) return dbRes;
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (entry.exp < nowMs()) return null;
  return { from: entry.from, verifier: entry.verifier };
}

// ── One-time Google signup tickets ─────────────────────────────────────────

async function persistTicket(ticket: string, email: string): Promise<void> {
  try {
    const { getDb } = await import("@/lib/db-pools");
    const db = await getDb();
    await db.collection("clc_google_signup_tickets").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    await db.collection("clc_google_signup_tickets").insertOne({ ticket, email, expiresAt: new Date(nowMs() + STATE_TTL_MS), createdAt: new Date() });
  } catch {}
}

export function issueGoogleSignupTicket(email: string): string {
  const ticket = randomBytes(24).toString("hex");
  signupTickets.set(ticket, { exp: nowMs() + STATE_TTL_MS, email });
  void persistTicket(ticket, email);
  return ticket;
}
export async function issueGoogleSignupTicketAsync(email: string): Promise<string> {
  return issueGoogleSignupTicket(email);
}

/** Returns the verified email the ticket was minted for, or null. */
export async function consumeGoogleSignupTicket(ticket: string): Promise<string | null> {
  try {
    const { getDb } = await import("@/lib/db-pools");
    const db = await getDb();
    const doc = await db.collection("clc_google_signup_tickets").findOneAndDelete({ ticket });
    if (doc && (doc.expiresAt as Date).getTime() >= nowMs()) return doc.email as string;
  } catch {}
  const entry = signupTickets.get(ticket);
  if (!entry) return null;
  signupTickets.delete(ticket);
  return entry.exp >= nowMs() ? entry.email : null;
}

// Backward-compat sync wrappers for tests (do not persist)
export function issueStateTokenSync(from: "login" | "signup" = "login"): string {
  const state = randomBytes(24).toString("hex");
  pendingStates.set(state, { exp: nowMs() + STATE_TTL_MS, from });
  return state;
}
export function consumeStateTokenSync(state: string): "login" | "signup" | null {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  return entry.exp >= nowMs() ? entry.from : null;
}

// ── Google calls ───────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function buildAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string
): Promise<string> {
  // Try to retrieve PKCE verifier for this state
  let verifier: string | undefined;
  const mem = pendingStates.get(state);
  if (mem?.verifier) verifier = mem.verifier;
  else {
    try {
      const { getDb } = await import("@/lib/db-pools");
      const db = await getDb();
      const doc = await db.collection("clc_google_oauth_states").findOne({ state });
      verifier = doc?.verifier ?? undefined;
    } catch {}
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  if (verifier) {
    const challenge = base64url(createHash("sha256").update(verifier).digest());
    params.set("code_challenge", challenge);
    params.set("code_challenge_method", "S256");
  }
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function buildAuthorizationUrlSync(
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
  redirectUri: string,
  codeVerifier?: string
): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  if (codeVerifier) body.set("code_verifier", codeVerifier);
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