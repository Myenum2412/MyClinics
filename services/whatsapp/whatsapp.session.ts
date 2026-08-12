import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

function sessionDir(): string {
  return process.env.WHATSAPP_SESSION_PATH ?? "./whatsapp-session";
}

function statusFile(): string {
  return join(sessionDir(), SESSION_STATUS_FILE);
}

const state: SessionState = {
  connected: false,
  stage: "idle",
  updatedAt: new Date().toISOString(),
};

let started = false;

export function getSessionState(): SessionState {
  return { ...state };
}

export function setSessionStage(stage: SessionState["stage"]): void {
  state.stage = stage;
  state.connected = stage === "ready";
  state.updatedAt = new Date().toISOString();
  persistState();
}

/**
 * Persists the worker's session stage to disk so other processes (the web
 * server) can surface the WhatsApp status on the dashboard.
 */
function persistState(): void {
  try {
    writeFileSync(statusFile(), JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    logger.warn("failed to persist whatsapp session status", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

/**
 * Reads the worker's persisted session stage. Returns null when the worker has
 * never written a status (e.g. it has not been started yet).
 */
export function readSessionStateFromDisk(): SessionState | null {
  try {
    const raw = readFileSync(statusFile(), "utf-8");
    const parsed = JSON.parse(raw) as SessionState;
    if (
      typeof parsed?.stage === "string" &&
      typeof parsed?.connected === "boolean"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Guards against duplicate session startup in the same process.
 */
export function tryMarkStarted(): boolean {
  if (started) return false;
  started = true;
  return true;
}
