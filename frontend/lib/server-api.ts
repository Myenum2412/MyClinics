import { cookies } from "next/headers";

// Server components call the standalone API server directly (server-to-server)
// and forward cookies so the backend sees the same request context as the
// browser. BACKEND_URL may be overridden via env; production defaults to the
// public API gateway on the application server (nginx -> Fastify).
export const BACKEND_URL =
  process.env.BACKEND_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://api.myclinic.myenum.in"
    : "http://localhost:3100");

interface ApiResult<T> {
  status: number;
  data: T;
}

export async function apiFetch<T = { error?: string }>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(cookie ? { cookie } : {}),
    },
    cache: "no-store",
  });
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = { error: "Invalid response from API server" } as T;
  }
  return { status: res.status, data };
}