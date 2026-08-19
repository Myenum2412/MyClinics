/**
 * Client-side API helper for the multi-tenant Clinic API.
 *
 * The Clinic API authenticates with a JWT bearer token issued by
 * `POST /api/clinics/auth/signup` and `POST /api/clinics/auth/login`.
 * The token embeds clinicId + role + doctorId/patientId, is stored in
 * localStorage (for API calls) AND mirrored in a non-httpOnly cookie
 * (so the Next.js proxy can verify sessions server-side for route
 * protection). Every tenant request is scoped to the caller's clinic
 * server-side — the URL clinicId is never trusted on its own.
 */

export const CLINIC_TOKEN_KEY = "clinic_token";

export type ClinicRole =
  | "platform_admin"
  | "clinic_admin"
  | "doctor"
  | "staff"
  | "patient";

/** Role hierarchy — higher roles pass `requireRoles(min)` gates. */
export const ROLE_PRIORITY: Record<ClinicRole, number> = {
  platform_admin: 5,
  clinic_admin: 4,
  doctor: 3,
  staff: 2,
  patient: 1,
};

export function can(role: ClinicRole, min: ClinicRole): boolean {
  return ROLE_PRIORITY[role] >= ROLE_PRIORITY[min];
}

export interface ClinicSession {
  userId: string;
  clinicId: string | null;
  role: ClinicRole;
  name: string | null;
  email: string | null;
  doctorId: string | null;
  patientId: string | null;
}

export interface LoginResponse extends ClinicSession {
  clinicName: string | null;
  token: string;
  tokenExpiresInSeconds: number;
}

export interface SignupResponse {
  clinicId: string;
  clinicName: string;
  slug: string;
  userId: string;
  role: "clinic_admin";
  token: string;
  tokenExpiresInSeconds: number;
}

export class ClinicApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "ClinicApiError";
  }
}

// ── Entities ───────────────────────────────────────────────────────────────

export interface Clinic {
  clinicId: string;
  slug: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  status: "active" | "suspended" | "deleted";
  settings: {
    workingHours: { open: string; close: string };
    slotMinutes: number;
    currency: string;
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ClinicUser {
  userId: string;
  name: string;
  email: string;
  role: "clinic_admin" | "doctor" | "staff" | "patient";
  doctorId: string | null;
  staffId: string | null;
  patientId: string | null;
  phone: string | null;
  status: "active" | "inactive";
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Doctor {
  doctorId: string;
  userId: string | null;
  name: string;
  specialization: string;
  licenseNo: string | null;
  qualification: string | null;
  phone: string | null;
  whatsapp?: string | null;
  email: string | null;
  fee: number | null;
  schedule: { day: string; start: string; end: string }[];
  status: "active" | "inactive";
  gender?: "male" | "female" | "other" | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  experienceYears?: number | null;
  registrationNo?: string | null;
  issuingAuthority?: string | null;
  department?: string | null;
  about?: string | null;
  languages?: string | null;
  notes?: string | null;
  username?: string | null;
  allowLogin?: boolean | null;
  profileImage?: string | null;
  scheduleDays?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  staffId: string;
  userId: string | null;
  name: string;
  position: string;
  phone: string | null;
  email: string | null;
  joinedAt: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  patientId: string;
  doctorId: string | null;
  userId: string | null;
  fullName: string;
  mobile: string;
  whatsapp?: string | null;
  email: string | null;
  gender: "male" | "female" | "other" | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  allergies: string[];
  notes: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineRecord {
  recordId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  symptoms: string | null;
  treatment: string | null;
  notes: string | null;
  visitDate: string;
  attachments: { name: string; url: string | null; mimeType: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export interface MedicineEntry {
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

export interface Prescription {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  visitDate: string;
  diagnosis: string | null;
  medicines: MedicineEntry[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BillStatus = "draft" | "issued" | "paid" | "void";

export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Bill {
  billId: string;
  billNumber: string;
  patientId: string;
  doctorId: string | null;
  items: BillItem[];
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  status: BillStatus;
  paymentMethod: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReportStatus = "uploaded" | "processing" | "ready" | "failed";

export interface Report {
  reportId: string;
  patientId: string;
  doctorId: string | null;
  type: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  notificationId: string;
  type: "appointment" | "bill" | "report" | "prescription" | "general";
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ClinicSettings {
  workingHours: { open: string; close: string };
  slotMinutes: number;
  currency: string;
  timezone: string;
  receiptFooter: string | null;
  smsEnabled: boolean;
  emailNotifications: boolean;
  updatedAt: string;
}

export interface AuditLogEntry {
  auditId: string;
  clinicId: string | null;
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
}

// ── Token & session helpers ────────────────────────────────────────────────

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    // Chrome's atob is strict about padding; JWT base64url parts are not
    // always padded to a multiple of 4 characters.
    const json = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sessionFromToken(token: string): ClinicSession | null {
  const payload = decodePayload(token);
  if (!payload) return null;
  const userId = (payload.sub as string | undefined) ?? (payload.userId as string | undefined);
  if (typeof userId !== "string") return null;
  const role = payload.role as ClinicRole;
  if (!ROLE_PRIORITY[role]) return null;
  return {
    userId,
    clinicId: (payload.clinicId as string | null) ?? null,
    role,
    name: (payload.name as string | null) ?? null,
    email: (payload.email as string | null) ?? null,
    doctorId: (payload.doctorId as string | null) ?? null,
    patientId: (payload.patientId as string | null) ?? null,
  };
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLINIC_TOKEN_KEY);
}

export function getSession(): ClinicSession | null {
  const token = getStoredToken();
  return token ? sessionFromToken(token) : null;
}

function isTokenExpired(token: string): boolean {
  const payload = decodePayload(token);
  if (!payload) return true;
  const exp = Number(payload.exp ?? 0);
  return !exp || exp * 1000 <= Date.now() + 30_000;
}

function setToken(token: string, ttlSeconds: number): void {
  localStorage.setItem(CLINIC_TOKEN_KEY, token);
  document.cookie = `${CLINIC_TOKEN_KEY}=${token}; path=/; max-age=${ttlSeconds}; samesite=lax`;
}

export function clearSession(): void {
  localStorage.removeItem(CLINIC_TOKEN_KEY);
  document.cookie = `${CLINIC_TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
}

/** Stores an externally issued session token (e.g. Google OAuth callback). */
export function storeSessionToken(token: string, ttlSeconds: number): void {
  setToken(token, ttlSeconds > 0 ? ttlSeconds : 24 * 3600);
}

// ── Request core ───────────────────────────────────────────────────────────

/**
 * API base for browser-side calls. In production the browser talks to the
 * API gateway directly (CORS-enabled) instead of round-tripping through the
 * Vercel proxy — that halves latency on every request. Falls back to the
 * same-origin proxy when unset (local dev).
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";

/** Base URL for direct API calls ("" = same-origin proxy in dev). */
export const API_BASE_URL = API_BASE;

/** Short-lived in-memory cache for GET requests (avoids refetch on nav). */
const getCache = new Map<string, { data: unknown; expires: number }>();
const GET_CACHE_TTL_MS = 30_000;

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  const method = (init.method ?? "GET").toUpperCase();
  const cacheKey = `${method} ${url}`;
  const skipCache = init.cache === "no-store";

  if (method === "GET" && !skipCache) {
    const hit = getCache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return hit.data as T;
  } else {
    getCache.clear();
  }

  const res = await fetch(url, { ...init, headers, cache: "no-store" });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = data as { error?: string; code?: string };
    throw new ClinicApiError(
      err.error ?? `Request failed (${res.status})`,
      res.status,
      err.code
    );
  }

  if (method === "GET" && !skipCache) {
    getCache.set(cacheKey, { data, expires: Date.now() + GET_CACHE_TTL_MS });
    if (getCache.size > 200) {
      const now = Date.now();
      for (const [key, entry] of getCache) {
        if (entry.expires <= now) getCache.delete(key);
      }
    }
  }
  return data as T;
}

async function slideSession(): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;
  try {
    const { token: fresh, tokenExpiresInSeconds } = await request<{
      token: string;
      tokenExpiresInSeconds?: number;
    }>("/api/clinics/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    setToken(fresh, tokenExpiresInSeconds ?? 12 * 60 * 60);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

/** Returns the current session, sliding the token if it is about to expire. */
export async function ensureSession(): Promise<ClinicSession | null> {
  const token = getStoredToken();
  if (!token) return null;
  if (isTokenExpired(token)) {
    if (!(await slideSession())) return null;
  }
  return sessionFromToken(getStoredToken()!);
}

/** Tenant-scoped helper: throws a clear error when clinicId is missing. */
function tenantPath(clinicId: string | null, suffix: string): string {
  if (!clinicId) {
    throw new ClinicApiError("No clinic in session", 400, "NO_CLINIC");
  }
  return `/api/clinics/${clinicId}${suffix}`;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function signupClinic(input: {
  clinicName: string;
  adminName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<SignupResponse> {
  const result = await request<SignupResponse>("/api/clinics/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setToken(result.token, result.tokenExpiresInSeconds);
  return result;
}

export async function signupClinicGoogle(input: {
  clinicName: string;
  adminName: string;
  gticket: string;
}): Promise<SignupResponse> {
  const result = await request<SignupResponse>("/api/clinics/auth/signup-google", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setToken(result.token, result.tokenExpiresInSeconds);
  return result;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const result = await request<LoginResponse>("/api/clinics/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setToken(result.token, result.tokenExpiresInSeconds);
  return result;
}

export async function logout(): Promise<void> {
  const token = getStoredToken();
  try {
    if (token) await request("/api/clinics/auth/logout", { method: "POST" });
  } catch {
    // server-side logout is best-effort (audit only)
  }
  clearSession();
}

export async function fetchMe(): Promise<ClinicSession> {
  return request<ClinicSession>("/api/clinics/auth/me");
}

// ── Clinic (own tenant) ────────────────────────────────────────────────────

export function getOwnClinic(clinicId: string): Promise<Clinic> {
  void clinicId;
  return request("/api/clinics/me");
}

export function updateOwnClinic(
  clinicId: string,
  input: Record<string, unknown>
): Promise<Clinic> {
  void clinicId;
  return request("/api/clinics/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── Patients ───────────────────────────────────────────────────────────────

export function listPatients(
  clinicId: string,
  query: { q?: string; doctorId?: string; status?: string; limit?: number } = {}
): Promise<PageResult<Patient>> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.doctorId) params.set("doctorId", query.doctorId);
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/patients?${params}`));
}

export function createPatient(
  clinicId: string,
  input: Record<string, unknown>
): Promise<Patient> {
  return request(tenantPath(clinicId, "/patients"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePatient(
  clinicId: string,
  patientId: string,
  input: Record<string, unknown>
): Promise<Patient> {
  return request(tenantPath(clinicId, `/patients/${patientId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function assignPatient(
  clinicId: string,
  patientId: string,
  doctorId: string | null
): Promise<Patient> {
  return request(tenantPath(clinicId, `/patients/${patientId}/assign`), {
    method: "POST",
    body: JSON.stringify({ doctorId }),
  });
}

export function deletePatient(clinicId: string, patientId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/patients/${patientId}`), {
    method: "DELETE",
  });
}

export function getMyPatient(clinicId: string): Promise<Patient | null> {
  return request(tenantPath(clinicId, "/me/patient"));
}

// ── Appointments ───────────────────────────────────────────────────────────

export function listAppointments(
  clinicId: string,
  query: {
    date?: string;
    from?: string;
    to?: string;
    status?: string;
    doctorId?: string;
    patientId?: string;
    limit?: number;
  } = {}
): Promise<PageResult<Appointment>> {
  const params = new URLSearchParams();
  if (query.date) params.set("date", query.date);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.status) params.set("status", query.status);
  if (query.doctorId) params.set("doctorId", query.doctorId);
  if (query.patientId) params.set("patientId", query.patientId);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/appointments?${params}`));
}

export function createAppointment(
  clinicId: string,
  input: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason?: string | null;
    notes?: string | null;
  }
): Promise<Appointment> {
  return request(tenantPath(clinicId, "/appointments"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAppointment(
  clinicId: string,
  appointmentId: string,
  input: Record<string, unknown>
): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAppointment(
  clinicId: string,
  appointmentId: string
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}`), {
    method: "DELETE",
  });
}

// ── Doctors ────────────────────────────────────────────────────────────────

export function listDoctors(
  clinicId: string,
  query: { q?: string; specialization?: string; status?: string; limit?: number } = {}
): Promise<PageResult<Doctor>> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.specialization) params.set("specialization", query.specialization);
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/doctors?${params}`));
}

export function createDoctor(
  clinicId: string,
  input: Record<string, unknown>
): Promise<Doctor> {
  return request(tenantPath(clinicId, "/doctors"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDoctor(
  clinicId: string,
  doctorId: string,
  input: Record<string, unknown>
): Promise<Doctor> {
  return request(tenantPath(clinicId, `/doctors/${doctorId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteDoctor(clinicId: string, doctorId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/doctors/${doctorId}`), {
    method: "DELETE",
  });
}

// ── Users (clinic accounts) ────────────────────────────────────────────────

export interface ClinicUser {
  userId: string;
  name: string;
  email: string;
  role: "clinic_admin" | "doctor" | "staff" | "patient";
  doctorId: string | null;
  staffId: string | null;
  patientId: string | null;
  phone: string | null;
  status: "active" | "inactive";
}

export function createClinicUser(
  clinicId: string,
  input: {
    name: string;
    email: string;
    password: string;
    role: "doctor" | "staff" | "patient";
    phone?: string | null;
    doctorId?: string;
    staffId?: string;
    patientId?: string;
  }
): Promise<ClinicUser> {
  return request(tenantPath(clinicId, "/users"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Staff ──────────────────────────────────────────────────────────────────

export function listStaff(
  clinicId: string,
  query: { q?: string; position?: string; status?: string; limit?: number } = {}
): Promise<PageResult<Staff>> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.position) params.set("position", query.position);
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/staff?${params}`));
}

export function createStaff(
  clinicId: string,
  input: Record<string, unknown>
): Promise<Staff> {
  return request(tenantPath(clinicId, "/staff"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStaff(
  clinicId: string,
  staffId: string,
  input: Record<string, unknown>
): Promise<Staff> {
  return request(tenantPath(clinicId, `/staff/${staffId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteStaff(clinicId: string, staffId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/staff/${staffId}`), {
    method: "DELETE",
  });
}



// ── Medicine ───────────────────────────────────────────────────────────────

export function listRecords(
  clinicId: string,
  query: { patientId?: string; from?: string; to?: string; limit?: number } = {}
): Promise<PageResult<MedicineRecord>> {
  const params = new URLSearchParams();
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/medicine?${params}`));
}

export function createRecord(
  clinicId: string,
  input: Record<string, unknown>
): Promise<MedicineRecord> {
  return request(tenantPath(clinicId, "/medicine"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRecord(
  clinicId: string,
  recordId: string,
  input: Record<string, unknown>
): Promise<MedicineRecord> {
  return request(tenantPath(clinicId, `/medicine/${recordId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteRecord(clinicId: string, recordId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/medicine/${recordId}`), {
    method: "DELETE",
  });
}

// ── Prescriptions ──────────────────────────────────────────────────────────

export function listPrescriptions(
  clinicId: string,
  query: { patientId?: string; doctorId?: string; from?: string; to?: string; limit?: number } = {}
): Promise<PageResult<Prescription>> {
  const params = new URLSearchParams();
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.doctorId) params.set("doctorId", query.doctorId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/prescriptions?${params}`));
}

export function createPrescription(
  clinicId: string,
  input: Record<string, unknown>
): Promise<Prescription> {
  return request(tenantPath(clinicId, "/prescriptions"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePrescription(
  clinicId: string,
  prescriptionId: string,
  input: Record<string, unknown>
): Promise<Prescription> {
  return request(tenantPath(clinicId, `/prescriptions/${prescriptionId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deletePrescription(
  clinicId: string,
  prescriptionId: string
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/prescriptions/${prescriptionId}`), {
    method: "DELETE",
  });
}

// ── Billing ────────────────────────────────────────────────────────────────

export function listBills(
  clinicId: string,
  query: { patientId?: string; status?: string; from?: string; to?: string; limit?: number } = {}
): Promise<PageResult<Bill>> {
  const params = new URLSearchParams();
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/billing?${params}`));
}

export function createBill(
  clinicId: string,
  input: Record<string, unknown>
): Promise<Bill> {
  return request(tenantPath(clinicId, "/billing"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateBill(
  clinicId: string,
  billId: string,
  input: Record<string, unknown>
): Promise<Bill> {
  return request(tenantPath(clinicId, `/billing/${billId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function voidBill(clinicId: string, billId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/billing/${billId}/void`), {
    method: "POST",
  });
}

// ── Reports ────────────────────────────────────────────────────────────────

export function listReports(
  clinicId: string,
  query: { patientId?: string; type?: string; status?: string; from?: string; to?: string; limit?: number } = {}
): Promise<PageResult<Report>> {
  const params = new URLSearchParams();
  if (query.patientId) params.set("patientId", query.patientId);
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/reports?${params}`));
}

export function createReport(
  clinicId: string,
  input: Record<string, unknown>
): Promise<Report> {
  return request(tenantPath(clinicId, "/reports"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateReport(
  clinicId: string,
  reportId: string,
  input: Record<string, unknown>
): Promise<Report> {
  return request(tenantPath(clinicId, `/reports/${reportId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteReport(clinicId: string, reportId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/reports/${reportId}`), {
    method: "DELETE",
  });
}

// ── Medical Record (Drive-style folders) ─────────────────────────────────

export interface MedicalRecordFile {
  fileId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  fileName: string;
  mimeType: string | null;
  size: number;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
}

export function listMedicalRecordFiles(clinicId: string): Promise<{ files: MedicalRecordFile[] }> {
  return request(tenantPath(clinicId, "/medical-record"), { cache: "no-store" });
}

export async function uploadMedicalRecordFile(
  clinicId: string,
  patientId: string,
  file: File
): Promise<MedicalRecordFile> {
  const form = new FormData();
  form.append("patientId", patientId);
  form.append("file", file);

  const headers: Record<string, string> = {};
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${tenantPath(clinicId, "/medical-record/upload")}`, {
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = data as { error?: string };
    throw new ClinicApiError(err.error ?? `Upload failed (${res.status})`, res.status);
  }
  return data as MedicalRecordFile;
}

export function getMedicalRecordDownloadUrl(
  clinicId: string,
  fileId: string
): Promise<{ url: string }> {
  return request(tenantPath(clinicId, `/medical-record/${fileId}/download`), {
    cache: "no-store",
  });
}

export function deleteMedicalRecordFile(
  clinicId: string,
  fileId: string
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/medical-record/${fileId}`), { method: "DELETE" });
}

// ── Settings ───────────────────────────────────────────────────────────────

export function getClinicSettings(clinicId: string): Promise<ClinicSettings> {
  return request(tenantPath(clinicId, "/settings"));
}

export function updateClinicSettings(
  clinicId: string,
  input: Record<string, unknown>
): Promise<ClinicSettings> {
  return request(tenantPath(clinicId, "/settings"), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── Platform services (WhatsApp + soul.md) ───────────────────────────────

export interface SoulRecord {
  content: string;
  fallbackReply: string;
  version: number;
}

export function getSoul(): Promise<{ soul: SoulRecord }> {
  return request("/api/soul");
}

export function updateSoul(
  content: string,
  fallbackReply?: string
): Promise<{ soul: SoulRecord }> {
  return request("/api/soul", {
    method: "PUT",
    body: JSON.stringify({ content, fallbackReply }),
  });
}

export interface WhatsappSessionState {
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

export interface WhatsappSession {
  state: WhatsappSessionState | null;
  qr: { dataUrl: string; generatedAt: string } | null;
}

/** Live WhatsApp session state — bypasses the GET cache for polling. */
export function getWhatsappSession(): Promise<WhatsappSession> {
  return request("/api/whatsapp/session", { cache: "no-store" });
}

// ── Notifications ──────────────────────────────────────────────────────────

export function listNotifications(
  clinicId: string,
  query: { unreadOnly?: boolean; limit?: number } = {}
): Promise<PageResult<Notification> & { unread: number }> {
  const params = new URLSearchParams();
  if (query.unreadOnly) params.set("unreadOnly", "true");
  params.set("limit", String(query.limit ?? 50));
  return request(tenantPath(clinicId, `/notifications?${params}`));
}

export function createNotification(
  clinicId: string,
  input: { recipientUserId: string; type: string; title: string; body?: string | null; link?: string | null }
): Promise<Notification> {
  return request(tenantPath(clinicId, "/notifications"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function markNotificationRead(clinicId: string, notificationId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/notifications/${notificationId}/read`), {
    method: "POST",
  });
}

export function markAllNotificationsRead(clinicId: string): Promise<{ ok: true; modified: number }> {
  return request(tenantPath(clinicId, "/notifications/read-all"), {
    method: "POST",
  });
}

// ── Audit logs ─────────────────────────────────────────────────────────────

export function listAuditLogs(
  clinicId: string,
  query: { entity?: string; action?: string; actorId?: string; from?: string; to?: string; limit?: number } = {}
): Promise<PageResult<AuditLogEntry>> {
  const params = new URLSearchParams();
  if (query.entity) params.set("entity", query.entity);
  if (query.action) params.set("action", query.action);
  if (query.actorId) params.set("actorId", query.actorId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("limit", String(query.limit ?? 100));
  return request(tenantPath(clinicId, `/audit-logs?${params}`));
}

// ── Patient portal (own data only) ─────────────────────────────────────────

export function myAppointments(clinicId: string, query: { status?: string; limit?: number } = {}): Promise<PageResult<Appointment>> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 50));
  return request(tenantPath(clinicId, `/me/appointments?${params}`));
}

export function myRecords(clinicId: string, query: { limit?: number } = {}): Promise<PageResult<MedicineRecord>> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 50));
  return request(tenantPath(clinicId, `/me/records?${params}`));
}

export function myPrescriptions(clinicId: string, query: { limit?: number } = {}): Promise<PageResult<Prescription>> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 50));
  return request(tenantPath(clinicId, `/me/prescriptions?${params}`));
}

export function myBills(clinicId: string, query: { limit?: number } = {}): Promise<PageResult<Bill>> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 50));
  return request(tenantPath(clinicId, `/me/bills?${params}`));
}

export function myReports(clinicId: string, query: { limit?: number } = {}): Promise<PageResult<Report>> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 50));
  return request(tenantPath(clinicId, `/me/reports?${params}`));
}

// ── Platform admin ─────────────────────────────────────────────────────────

export function listAllClinics(
  query: { status?: string; q?: string; limit?: number } = {}
): Promise<PageResult<Clinic>> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  params.set("limit", String(query.limit ?? 100));
  return request(`/api/clinics?${params}`);
}

export function createClinic(input: {
  name: string;
  adminName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<Clinic> {
  return request("/api/clinics", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function suspendClinic(clinicId: string): Promise<{ ok: true }> {
  return request(`/api/clinics/${clinicId}/suspend`, { method: "POST" });
}

export function activateClinic(clinicId: string): Promise<{ ok: true }> {
  return request(`/api/clinics/${clinicId}/activate`, { method: "POST" });
}

export function getAnyClinic(clinicId: string): Promise<Clinic> {
  return request(`/api/clinics/${clinicId}`);
}

export function updateAnyClinic(
  clinicId: string,
  input: Record<string, unknown>
): Promise<Clinic> {
  return request(`/api/clinics/${clinicId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}