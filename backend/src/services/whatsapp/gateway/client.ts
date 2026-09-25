import { requireGatewayConfig } from "@/services/whatsapp/gateway/config";
import { signedHeaders } from "@/services/whatsapp/gateway/signature";

export type GatewayStatus =
  | "STARTING"
  | "QR_REQUIRED"
  | "READY"
  | "DISCONNECTED"
  | "LOGGED_OUT"
  | "STOPPED";

export interface GatewaySession {
  clinicId: string;
  status: GatewayStatus;
  phone: string | null;
  /** PNG data URL, present only while status is QR_REQUIRED. */
  qr: string | null;
}

export class GatewayError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

const TIMEOUT_MS = 15_000;

async function call<T>(method: string, path: string, payload?: unknown): Promise<T> {
  const cfg = requireGatewayConfig();
  const body = payload === undefined ? "" : JSON.stringify(payload);
  let res: Response;
  try {
    res = await fetch(cfg.url + path, {
      method,
      headers: {
        ...signedHeaders(cfg.secret, body),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body || undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new GatewayError(0, `gateway unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? `gateway responded ${res.status}`;
    throw new GatewayError(res.status, message);
  }
  return data as T;
}

const enc = encodeURIComponent;

export interface SendResult {
  id: number;
  duplicate: boolean;
}

export const gateway = {
  startSession: (clinicId: string) => call<GatewaySession>("POST", `/sessions/${enc(clinicId)}/start`),
  stopSession: (clinicId: string) => call<GatewaySession>("POST", `/sessions/${enc(clinicId)}/stop`),
  logoutSession: (clinicId: string) => call<{ ok: true }>("DELETE", `/sessions/${enc(clinicId)}`),

  /** Returns null when the gateway has never seen this clinic. */
  async getSession(clinicId: string): Promise<GatewaySession | null> {
    try {
      return await call<GatewaySession>("GET", `/sessions/${enc(clinicId)}/status`);
    } catch (err) {
      if (err instanceof GatewayError && err.status === 404) return null;
      throw err;
    }
  },

  sendText: (clinicId: string, to: string, text: string, opts: { dedupeKey?: string; priority?: 0 | 1 } = {}) =>
    call<SendResult>("POST", `/sessions/${enc(clinicId)}/messages`, { to, text, ...opts }),

  sendDocument: (
    clinicId: string,
    doc: { to: string; filename: string; mimetype: string; caption?: string; contentBase64: string; dedupeKey?: string }
  ) => call<SendResult>("POST", `/sessions/${enc(clinicId)}/documents`, doc),
};
