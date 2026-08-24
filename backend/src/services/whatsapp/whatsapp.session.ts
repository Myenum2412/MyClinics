import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import { logger } from "@/lib/logger";

export interface SessionState {
  connected: boolean;
  stage:
    | "idle"
    | "qr"
    | "authenticated"
    | "ready"
    | "disconnected"
    | "error";
  updatedAt: string;
}

export const SESSION_STATUS_FILE = "status.json";
export const SESSION_QR_TEXT_FILE = "qr.txt";

/**
 * Key identifying which WhatsApp connection a state belongs to.
 * - LEGACY_SESSION_KEY → the original single bot number; its status.json and
 *   qr.txt stay at the session root (backward compatible).
 * - any other key (a clinicId) → `<sessionRoot>/clinics/<clinicId>/`.
 */
export const LEGACY_SESSION_KEY = "__legacy__";

export function rootSessionDir(): string {
  return process.env.WHATSAPP_SESSION_PATH ?? "./whatsapp-session";
}

/** Keeps clinic ids safe to use as folder names. */
function sanitizeKey(key: string): string {
  const clean = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return clean || "unknown";
}

/** Directory that holds status.json / qr.txt / LocalAuth data for a key. */
export function sessionDirForKey(key: string): string {
  if (key === LEGACY_SESSION_KEY) return rootSessionDir();
  return join(rootSessionDir(), "clinics", sanitizeKey(key));
}

function statusFileForKey(key: string): string {
  return join(sessionDirForKey(key), SESSION_STATUS_FILE);
}

const states = new Map<string, SessionState>();

function blankState(): SessionState {
  return { connected: false, stage: "idle", updatedAt: new Date().toISOString() };
}

export function getSessionState(key: string): SessionState {
  return { ...(states.get(key) ?? blankState()) };
}

export function setSessionStage(key: string, stage: SessionState["stage"]): void {
  const state = states.get(key) ?? blankState();
  state.stage = stage;
  state.connected = stage === "ready";
  state.updatedAt = new Date().toISOString();
  states.set(key, state);
  persistState(key, state);
}

/**
 * Persists a connection's stage to disk so other processes (the web server)
 * can surface the WhatsApp status on the dashboard.
 */
function persistState(key: string, state: SessionState): void {
  try {
    mkdirSync(sessionDirForKey(key), { recursive: true });
    writeFileSync(statusFileForKey(key), JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    logger.warn("failed to persist whatsapp session status", {
      key,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

/**
 * Reads a persisted connection stage. Returns null when it has never been
 * written (e.g. that connection has not been started yet).
 */
export function readSessionStateFromDisk(key: string = LEGACY_SESSION_KEY): SessionState | null {
  try {
    const raw = readFileSync(statusFileForKey(key), "utf-8");
    const parsed = JSON.parse(raw) as SessionState;
    if (
      typeof parsed?.stage === "string" &&
      typeof parsed?.connected === "boolean" &&
      typeof parsed?.updatedAt === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Writes the raw QR payload plus a rendered PNG into the session dir. */
export async function writeQrFiles(key: string, qr: string): Promise<{ txt: string; png: string }> {
  const dir = sessionDirForKey(key);
  const txtFile = join(dir, SESSION_QR_TEXT_FILE);
  const pngFile = join(dir, "qr.png");
  mkdirSync(dir, { recursive: true });
  writeFileSync(txtFile, qr, "utf-8");
  await QRCode.toFile(pngFile, qr, { width: 400 }).catch(() => {});
  return { txt: txtFile, png: pngFile };
}

const QR_FRESH_MS = 25 * 1000;

/**
 * Reads the still-fresh QR payload for a connection. Returns null when the
 * file is missing or older than 5 minutes (QR codes expire quickly).
 */
export function readQrTextFromDisk(key: string): { content: string; generatedAt: string } | null {
  const file = join(sessionDirForKey(key), SESSION_QR_TEXT_FILE);
  try {
    const stat = statSync(file);
    if (Date.now() - stat.mtimeMs > QR_FRESH_MS) return null;
    return {
      content: readFileSync(file, "utf-8"),
      generatedAt: new Date(stat.mtimeMs).toISOString(),
    };
  } catch {
    return null;
  }
}

/** Removes only the Chromium singleton lock files that cause "browser is already running" errors. */
export function clearSingletonLock(key: string): void {
  if (key === LEGACY_SESSION_KEY) return;
  const dir = sessionDirForKey(key);
  // LocalAuth stores the Chrome profile under <dir>/session-<clientId>/
  // The lock files are inside that profile directory.
  const profileDir = join(dir, `session-${key === LEGACY_SESSION_KEY ? "legacy" : `clinic-${key}`}`);
  for (const name of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    try {
      rmSync(join(profileDir, name), { force: true });
    } catch {}
    try {
      rmSync(join(dir, name), { force: true });
    } catch {}
  }
}

/** Deletes every persisted artifact (LocalAuth + status + QR) for a key. */
export function clearSessionArtifacts(key: string): void {
  if (key === LEGACY_SESSION_KEY) {
    // Never wipe the legacy session automatically.
    return;
  }
  try {
    rmSync(sessionDirForKey(key), { recursive: true, force: true });
  } catch (err) {
    logger.warn("failed to clear whatsapp session artifacts", {
      key,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
