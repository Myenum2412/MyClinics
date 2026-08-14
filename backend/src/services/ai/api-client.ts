import type { StoredAppointment } from "@/services/ai/appointment.service";

// The worker reaches the AI surface over HTTP on the API server (this
// keeps the WhatsApp process isolated from dashboard modules, preserving the
// AI_INTERNAL_TOKEN boundary). Defaults to the local API server port.
const BASE_URL =
  process.env.APP_URL ??
  `http://localhost:${process.env.BACKEND_PORT ?? 3100}`;
const TOKEN = process.env.AI_INTERNAL_TOKEN ?? "";

export interface AiContextResponse {
  organizationId: string;
  doctors: string[];
  todayISO: string;
  workingHours: { open: string; close: string; slotMinutes: number };
}

export interface AiAppointmentResponse {
  appointment?: StoredAppointment;
  error?: string;
  code?: string;
}

export interface AiAvailabilityResponse {
  available?: boolean;
  error?: string;
  code?: string;
}

interface ApiOptions {
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

interface ApiResult<T> {
  status: number;
  data: T;
}

export class AiApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "AiApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Calls the backend /api/ai/* endpoints from the WhatsApp worker.
 * This is the only way the AI reaches business data — it can never touch
 * any other dashboard module.
 */
export async function aiApi<T>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const url = new URL(path, BASE_URL);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty body
  }

  if (!res.ok) {
    const errorBody = data as { error?: string; code?: string } | null;
    throw new AiApiError(
      res.status,
      errorBody?.error ?? `Backend request failed (${res.status})`,
      errorBody?.code
    );
  }

  return { status: res.status, data: data as T };
}

export function getAiContext(organizationId: string): Promise<ApiResult<AiContextResponse>> {
  return aiApi<AiContextResponse>("/api/ai/context", { query: { organizationId } });
}
