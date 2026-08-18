/**
 * Client-side API helper for the multi-tenant (MT) API.
 *
 * Unlike the legacy next-auth session flow, the MT API authenticates with a
 * JWT bearer token issued by `POST /api/mt/auth/signup` and
 * `POST /api/mt/auth/login`. The token embeds clinicId + role and is stored
 * in localStorage so the tenant boundary travels with every request.
 */
export const MT_TOKEN_KEY = "mt_token";

export interface MtTokenResponse {
  token: string;
  tokenExpiresInSeconds: number;
}

export interface SignupResponse extends MtTokenResponse {
  clinicId: string;
  clinicName: string;
  slug: string;
  userId: string;
  role: "clinic_admin";
}

export interface LoginResponse extends MtTokenResponse {
  userId: string;
  clinicId: string;
  clinicName: string | null;
  role: "clinic_admin" | "staff" | "patient";
  name: string | null;
  email: string | null;
  patientId: string | null;
}

export class MtApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "MtApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = typeof window !== "undefined" ? localStorage.getItem(MT_TOKEN_KEY) : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = data as { error?: string; code?: string };
    throw new MtApiError(
      err.error ?? `Request failed (${res.status})`,
      res.status,
      err.code
    );
  }
  return data as T;
}

/** Creates the clinic tenant and its clinic_admin account. */
export async function signupClinic(input: {
  clinicName: string;
  adminName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<SignupResponse> {
  const result = await request<SignupResponse>("/api/mt/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  localStorage.setItem(MT_TOKEN_KEY, result.token);
  return result;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const result = await request<LoginResponse>("/api/mt/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  localStorage.setItem(MT_TOKEN_KEY, result.token);
  return result;
}

export function logout(): void {
  localStorage.removeItem(MT_TOKEN_KEY);
}

export async function fetchMe(): Promise<{
  userId: string;
  clinicId: string;
  role: string;
  name: string | null;
  email: string | null;
  patientId: string | null;
}> {
  return request("/api/mt/auth/me");
}