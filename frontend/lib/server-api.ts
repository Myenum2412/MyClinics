import { cookies } from "next/headers";

// Server components call the standalone API server directly (server-to-server)
// and forward the next-auth session cookie, so the backend's auth plugin
// verifies the same JWE the browser holds.
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3100";

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