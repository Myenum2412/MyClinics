/**
 * Client-side API helper for the multi-tenant Clinic API.
 *
 * The Clinic API authenticates with a JWT bearer token issued by
 * `POST /api/clinics/auth/signup` and `POST /api/clinics/auth/login`.
 * The token embeds clinicId + role + doctorId/patientId, is stored in
 * localStorage (for API calls) AND mirrored in a non-httpOnly cookie
 * (so the Next.js proxy can verify sessions server-side for route
 * protection). Every tenant request is scoped to the caller's clinic
 * server-side  the URL clinicId is never trusted on its own.
 */

import { nowMs } from "./datetime";

export const CLINIC_TOKEN_KEY = "clinic_token";

export type ClinicRole =
  | "platform_admin"
  | "clinic_admin"
  | "pharmacy_manager"
  | "doctor"
  | "pharmacist"
  | "inventory_staff"
  | "billing_staff"
  | "staff"
  | "patient";

/** Role hierarchy  higher roles pass `requireRoles(min)` gates. */
export const ROLE_PRIORITY: Record<ClinicRole, number> = {
  platform_admin: 7,
  clinic_admin: 6,
  pharmacy_manager: 5,
  doctor: 4,
  pharmacist: 3,
  inventory_staff: 3,
  billing_staff: 3,
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

export interface ClinicProfile {
  clinicType: string | null;
  registrationNumber: string | null;
  establishedYear: number | null;
  whatsapp: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  specializations: string[];
  services: string[];
  emergencyContact: string | null;
  gstNumber: string | null;
  taxBusinessId: string | null;
  socialMedia: {
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
  };
}

export interface WeeklyScheduleDay {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

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
    workingHours: { open: string; close: string; days?: string | null };
    slotMinutes: number;
    currency: string;
    timezone: string;
    weeklySchedule?: WeeklyScheduleDay[];
  };
  profile?: ClinicProfile;
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
  height: string | null;
  weight: string | null;
  bloodPressure: string | null;
  temperature: string | null;
  pulse: string | null;
  respiratoryRate: string | null;
  spo2: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactMobile: string | null;
  allergies: string[];
  medicalConditions: string | null;
  previousSurgeries: string | null;
  currentMedications: string | null;
  idType: string | null;
  idNumber: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insurancePolicyHolderName: string | null;
  insuranceValidTill: string | null;
  referredBy: string | null;
  howDidYouHear: string | null;
  notes: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type AppointmentQueueStatus =
  | "scheduled"
  | "checked_in"
  | "waiting"
  | "called"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show"
  | "skipped"
  | "rescheduled";

export type QueueChannel = "whatsapp" | "sms" | "push" | "in_app";

export type QueueStage =
  | "you_are_next"
  | "please_be_ready"
  | "token_called"
  | "proceed_to_room";

export interface QueueSettings {
  clinicId: string;
  enabledStages: QueueStage[];
  channel: QueueChannel;
  templateOverrides?: Partial<Record<QueueStage, string>>;
}

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
  queueStatus: AppointmentQueueStatus | null;
  tokenNumber: number | null;
  session: "morning" | "afternoon" | "evening" | null;
  priority: boolean;
  checkedInAt: string | null;
  calledAt: string | null;
  completedAt: string | null;
  notifiedStages: string[];
  queueHistory: { status: AppointmentQueueStatus; at: string; by?: string | null }[];
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
  attachments: {
    name: string;
    url: string | null;
    mimeType: string | null;
    fileId?: string | null;
  }[];
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

export type PaymentType = "cash" | "upi" | "card" | "other";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
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
  paymentType: PaymentType | null;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  invoiceDate: string;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  internalNotes: string | null;
  reference: string | null;
  sendMethod: "whatsapp" | "email" | "none";
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
  workingHours: { open: string; close: string; days?: string | null };
  slotMinutes: number;
  currency: string;
  timezone: string;
  weeklySchedule?: WeeklyScheduleDay[];
  receiptFooter: string | null;
  smsEnabled: boolean;
  emailNotifications: boolean;
  lookups?: Record<string, string[]>;
  gstin?: string | null;
  udyam?: string | null;
  termsAndConditions?: string | null;
  upiId?: string | null;
  qrCodeUrl?: string | null;
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
  return !exp || exp * 1000 <= nowMs() + 30_000;
}

function setToken(token: string, ttlSeconds: number): void {
  localStorage.setItem(CLINIC_TOKEN_KEY, token);
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${CLINIC_TOKEN_KEY}=${token}; path=/; max-age=${ttlSeconds}; samesite=lax${secure}`;
}

export function clearSession(): void {
  localStorage.removeItem(CLINIC_TOKEN_KEY);
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${CLINIC_TOKEN_KEY}=; path=/; max-age=0; samesite=lax${secure}`;
}

/** Stores an externally issued session token (e.g. Google OAuth callback). */
export function storeSessionToken(token: string, ttlSeconds: number): void {
  setToken(token, ttlSeconds > 0 ? ttlSeconds : 24 * 3600);
}

// ── Request core ───────────────────────────────────────────────────────────

/**
 * API base for browser-side calls. In production the browser talks to the
 * API gateway directly (CORS-enabled) instead of round-tripping through the
 * Vercel proxy  that halves latency on every request. Falls back to the
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
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  // Only set Content-Type for an actual JSON payload. Sending
  // "application/json" on a bodyless request (e.g. DELETE) makes the server
  // try to parse an empty body and fail with 400 "Invalid JSON body".
  const hasBody = init.body != null;
  if (hasBody && typeof init.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${API_BASE}${path}`;
  const method = (init.method ?? "GET").toUpperCase();
  const cacheKey = `${method} ${url}`;
  const skipCache = init.cache === "no-store";

  if (method === "GET" && !skipCache) {
    const hit = getCache.get(cacheKey);
    if (hit && hit.expires > nowMs()) return hit.data as T;
  } else {
    getCache.clear();
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, cache: "no-store" });
  } catch (e) {
    // Fallback: if direct API_BASE fetch failed, retry via same-origin proxy (avoids CORS/network issues on Vercel)
    if (API_BASE && url.startsWith(API_BASE)) {
      try {
        const proxyUrl = url.slice(API_BASE.length);
        res = await fetch(proxyUrl, { ...init, headers, cache: "no-store" });
      } catch (e2) {
        const msg = e instanceof TypeError ? `Network error  cannot reach API at ${API_BASE || "proxy"} (${e instanceof Error ? e.message : ""}). Retried via proxy also failed. Check backend at https://api.myclinic.myenum.in is up and CORS allows ${typeof window !== "undefined" ? window.location.origin : ""}.` : e instanceof Error ? e.message : "Network error";
        throw new ClinicApiError(msg, 0, "NETWORK_ERROR");
      }
    } else {
      const msg = e instanceof TypeError ? `Network error  cannot reach API at ${API_BASE || "proxy"} (${e.message}). Check backend at https://api.myclinic.myenum.in is up and CORS allows ${typeof window !== "undefined" ? window.location.origin : ""}.` : e instanceof Error ? e.message : "Network error";
      throw new ClinicApiError(msg, 0, "NETWORK_ERROR");
    }
  }

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
    getCache.set(cacheKey, { data, expires: nowMs() + GET_CACHE_TTL_MS });
    if (getCache.size > 200) {
      const now = nowMs();
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
  params.set("limit", String(query.limit ?? 50));
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

export function resendPatientCredentials(
  clinicId: string,
  patientId: string
): Promise<{ email: string; password: string }> {
  return request(tenantPath(clinicId, `/patients/${patientId}/resend-credentials`), {
    method: "POST",
  });
}

export function sendPatientWelcome(
  clinicId: string,
  patientId: string,
  input: { sendCredentials?: boolean; password?: string | null }
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/patients/${patientId}/send-welcome`), {
    method: "POST",
    body: JSON.stringify(input),
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
  params.set("limit", String(query.limit ?? 50));
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

// ── Appointment Token / Queue management ────────────────────────────────────

export interface QueueItem {
  appointment: Appointment;
  patientName: string;
  patientPhone: string | null;
  doctorName: string;
}

export interface QueueSnapshot {
  date: string;
  doctorId: string | null;
  current: QueueItem | null;
  next: QueueItem | null;
  waiting: QueueItem[];
  completed: QueueItem[];
  upcoming: QueueItem[];
  counts: {
    waiting: number;
    called: number;
    inConsultation: number;
    completed: number;
    upcoming: number;
    priority: number;
  };
}

export function getAppointmentQueue(
  clinicId: string,
  query: { doctorId?: string; date?: string } = {}
): Promise<QueueSnapshot> {
  const params = new URLSearchParams();
  if (query.doctorId) params.set("doctorId", query.doctorId);
  if (query.date) params.set("date", query.date);
  return request(tenantPath(clinicId, `/appointments/queue?${params}`));
}

export function queueCheckIn(
  clinicId: string,
  appointmentId: string,
  priority = false
): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}/check-in`), {
    method: "POST",
    body: JSON.stringify({ priority }),
  });
}

export function queueCallNext(
  clinicId: string,
  input: { doctorId?: string; date?: string }
): Promise<{ appointmentId: string | null }> {
  return request(tenantPath(clinicId, `/appointments/call-next`), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function queueStartConsultation(
  clinicId: string,
  appointmentId: string
): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}/start-consultation`), {
    method: "POST",
  });
}

export function queueSkip(clinicId: string, appointmentId: string): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}/skip`), {
    method: "POST",
  });
}

export function queueRecall(clinicId: string, appointmentId: string): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}/recall`), {
    method: "POST",
  });
}

export function queueComplete(clinicId: string, appointmentId: string): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}/complete`), {
    method: "POST",
  });
}

export function queueNoShow(clinicId: string, appointmentId: string): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}/no-show`), {
    method: "POST",
  });
}

export function queueCancel(clinicId: string, appointmentId: string): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}/cancel`), {
    method: "POST",
  });
}

export function queueReschedule(
  clinicId: string,
  appointmentId: string,
  input: { date: string; time: string }
): Promise<Appointment> {
  return request(tenantPath(clinicId, `/appointments/${appointmentId}/reschedule`), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getQueueSettings(clinicId: string): Promise<QueueSettings> {
  return request(tenantPath(clinicId, `/appointments/queue-settings`));
}

export function saveQueueSettings(
  clinicId: string,
  input: Partial<QueueSettings>
): Promise<QueueSettings> {
  return request(tenantPath(clinicId, `/appointments/queue-settings`), {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getAppointmentNotifications(
  clinicId: string,
  appointmentId: string
): Promise<{ notifications: AppointmentNotification[] }> {
  return request(
    tenantPath(clinicId, `/appointments/${appointmentId}/notifications`)
  );
}

export function getAllAppointmentNotifications(
  clinicId: string
): Promise<{ notifications: AppointmentNotification[] }> {
  return request(tenantPath(clinicId, `/appointments/notifications`));
}

export interface AppointmentNotification {
  _id?: string;
  appointmentId: string;
  clinicId: string;
  recipientRole: "patient" | "doctor";
  recipientId: string;
  type: "event" | "reminder" | "queue";
  action: "created" | "updated" | "cancelled" | "reminder" | "queue";
  status: "pending" | "processing" | "enqueued" | "sent" | "failed";
  phone?: string;
  message?: string;
  stage?: string | null;
  channel?: string | null;
  scheduledTime: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
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
  params.set("limit", String(query.limit ?? 50));
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

export function getDoctor(
  clinicId: string,
  doctorId: string
): Promise<Doctor> {
  return request(tenantPath(clinicId, `/doctors/${doctorId}`));
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
    whatsapp?: string | null;
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

export function updateClinicUser(
  clinicId: string,
  userId: string,
  input: {
    name?: string;
    phone?: string | null;
    whatsapp?: string | null;
    status?: "active" | "inactive";
    password?: string;
  }
): Promise<ClinicUser> {
  return request(tenantPath(clinicId, `/users/${userId}`), {
    method: "PATCH",
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
  params.set("limit", String(query.limit ?? 50));
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
  params.set("limit", String(query.limit ?? 50));
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
  params.set("limit", String(query.limit ?? 50));
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
  params.set("limit", String(query.limit ?? 50));
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

/** Downloads the bill as a PDF and triggers the browser save dialog. */
export async function downloadBillPdf(
  clinicId: string,
  billId: string,
  filename: string
): Promise<void> {
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${tenantPath(clinicId, `/billing/${billId}/pdf`)}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    let error = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      error = (data as { error?: string }).error ?? error;
    } catch {
      // non-JSON error body  keep the default message
    }
    throw new ClinicApiError(error, res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ── Medical Record (Google Drive-style folders) ──────────────────────────

export interface MedicalRecordFileVersion {
  version: number;
  fileName: string;
  mimeType: string | null;
  size: number;
  uploadedByName: string | null;
  createdAt: string;
}

export type WhatsAppCopyStatus = "queued" | "skipped_no_phone" | "failed";

export interface WhatsAppCopyResult {
  status: WhatsAppCopyStatus;
  /** true when the file exceeded the 1.5MB inline-media limit and only a portal link was shared. */
  largeFile: boolean;
}

export interface MedicalRecordFile {
  fileId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  fileName: string;
  /** Folder key  default folder key ("prescriptions", "lab-reports", …) or a custom folder id. */
  folder: string;
  mimeType: string | null;
  size: number;
  version: number;
  versions: MedicalRecordFileVersion[];
  downloadCount: number;
  lastDownloadedAt: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
  whatsapp?: WhatsAppCopyResult;
}

/** Return shape of an upload: the stored medical-record file plus the WhatsApp-copy outcome. */
export type MedicalRecordFileUploadResult = MedicalRecordFile & {
  whatsapp?: WhatsAppCopyResult;
};

export interface MedicalRecordFolder {
  folderId: string;
  patientId: string;
  name: string;
  isDefault: boolean;
  defaultKey: string | null;
  parentFolderId: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface MedicalRecordListFilter {
  q?: string;
  patientId?: string;
  folder?: string;
  type?: string;
  from?: string;
  to?: string;
}

export function listMedicalRecordFiles(
  clinicId: string,
  filter: MedicalRecordListFilter = {}
): Promise<{ files: MedicalRecordFile[] }> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return request(tenantPath(clinicId, `/medical-record${qs ? `?${qs}` : ""}`), {
    cache: "no-store",
  });
}

export interface UploadOptions {
  onProgress?: (progress: number, loaded: number, total: number, speed: number) => void;
  onXhrCreated?: (xhr: XMLHttpRequest) => void;
}

export function uploadMedicalRecordFile(
  clinicId: string,
  patientId: string,
  file: File,
  folder?: string,
  options?: UploadOptions
): Promise<MedicalRecordFileUploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("patientId", patientId);
    if (folder) form.append("folder", folder);
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    if (options?.onXhrCreated) {
      options.onXhrCreated(xhr);
    }

    const startTime = Date.now();
    const startLoaded = 0;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options?.onProgress) {
        const now = Date.now();
        const timeDiff = (now - startTime) / 1000;
        const loaded = event.loaded;
        const total = event.total;
        const progress = Math.min(100, Math.round((loaded / total) * 100));
        const speed = timeDiff > 0 ? (loaded - startLoaded) / timeDiff : 0;
        options.onProgress(progress, loaded, total, speed);
      }
    };

    xhr.onload = () => {
      let data: unknown = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as MedicalRecordFile);
      } else {
        const err = data as { error?: string };
        reject(new ClinicApiError(err.error ?? `Upload failed (${xhr.status})`, xhr.status));
      }
    };

    xhr.onerror = () => {
      reject(new ClinicApiError("Network error during upload", 0));
    };

    xhr.onabort = () => {
      reject(new ClinicApiError("Upload cancelled", 0));
    };

    xhr.open("POST", `${API_BASE}${tenantPath(clinicId, "/medical-record/upload")}`);

    const token = typeof window !== "undefined" ? getStoredToken() : null;
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.send(form);
  });
}

export async function uploadMedicalRecordFileVersion(
  clinicId: string,
  fileId: string,
  file: File
): Promise<MedicalRecordFileUploadResult> {
  const form = new FormData();
  form.append("patientId", "");
  form.append("file", file);

  const headers: Record<string, string> = {};
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${API_BASE}${tenantPath(clinicId, `/medical-record/files/${fileId}/version`)}`,
    { method: "POST", headers, body: form, cache: "no-store" }
  );

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

export type AvatarOwnerType = "patient" | "doctor" | "clinic";

export function avatarPath(
  clinicId: string,
  ownerType: AvatarOwnerType,
  ownerId: string
): string {
  return tenantPath(clinicId, `/avatars/${ownerType}/${encodeURIComponent(ownerId)}`);
}

export async function getAvatarUrl(
  clinicId: string,
  ownerType: AvatarOwnerType,
  ownerId: string
): Promise<{ url: string | null }> {
  // The backend serves avatar bytes directly (Content-Type: image/*) and requires auth.
  // We fetch with Bearer token and return a blob object URL so <img> does not need to
  // re-authenticate via Cookie (which fails for <img> on some deployments). The caller
  // should revoke the URL when done (PersonAvatar does this via bustAvatarCache).
  try {
    if (!clinicId || !ownerType || !ownerId) return { url: null };
    const headers: Record<string, string> = {};
    const token = typeof window !== "undefined" ? getStoredToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${avatarPath(clinicId, ownerType, ownerId)}`, {
      method: "GET",
      cache: "no-store",
      headers,
    });
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && type.startsWith("image/")) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      return { url: objectUrl };
    }
  } catch {
    // ignore  fall back to initials below
  }
  return { url: null };
}

export async function uploadAvatar(
  clinicId: string,
  ownerType: AvatarOwnerType,
  ownerId: string,
  file: File
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("ownerType", ownerType);
  form.append("ownerId", ownerId);
  form.append("file", file);

  const headers: Record<string, string> = {};
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${avatarPath(clinicId, ownerType, ownerId)}`, {
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
    throw new ClinicApiError(err.error ?? `Avatar upload failed (${res.status})`, res.status);
  }
  return data as { url: string };
}

export function renameMedicalRecordFile(
  clinicId: string,
  fileId: string,
  fileName: string
): Promise<MedicalRecordFile> {
  return request(tenantPath(clinicId, `/medical-record/files/${fileId}`), {
    method: "PATCH",
    body: JSON.stringify({ fileName }),
  });
}

export function moveMedicalRecordFile(
  clinicId: string,
  fileId: string,
  folder: string
): Promise<MedicalRecordFile> {
  return request(tenantPath(clinicId, `/medical-record/files/${fileId}/move`), {
    method: "POST",
    body: JSON.stringify({ folder }),
  });
}

export function copyMedicalRecordFile(
  clinicId: string,
  fileId: string,
  folder: string
): Promise<MedicalRecordFile> {
  return request(tenantPath(clinicId, `/medical-record/files/${fileId}/copy`), {
    method: "POST",
    body: JSON.stringify({ folder }),
  });
}

export function listMedicalRecordFolders(
  clinicId: string,
  patientId?: string
): Promise<{ folders: MedicalRecordFolder[] }> {
  const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
  return request(tenantPath(clinicId, `/medical-record/folders${qs}`), { cache: "no-store" });
}

export function createMedicalRecordFolder(
  clinicId: string,
  patientId: string,
  name: string,
  parentFolderId?: string | null
): Promise<MedicalRecordFolder> {
  return request(tenantPath(clinicId, "/medical-record/folders"), {
    method: "POST",
    body: JSON.stringify({ patientId, name, parentFolderId: parentFolderId ?? null }),
  });
}

export function renameMedicalRecordFolder(
  clinicId: string,
  folderId: string,
  name: string
): Promise<MedicalRecordFolder> {
  return request(tenantPath(clinicId, `/medical-record/folders/${folderId}`), {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function moveMedicalRecordFolder(
  clinicId: string,
  folderId: string,
  parentFolderId: string | null
): Promise<MedicalRecordFolder> {
  return request(tenantPath(clinicId, `/medical-record/folders/${folderId}/move`), {
    method: "POST",
    body: JSON.stringify({ parentFolderId }),
  });
}

export function copyMedicalRecordFolder(
  clinicId: string,
  folderId: string,
  parentFolderId: string | null
): Promise<MedicalRecordFolder> {
  return request(tenantPath(clinicId, `/medical-record/folders/${folderId}/copy`), {
    method: "POST",
    body: JSON.stringify({ parentFolderId }),
  });
}

export function deleteMedicalRecordFolder(
  clinicId: string,
  folderId: string
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/medical-record/folders/${folderId}`), {
    method: "DELETE",
  });
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

// ── Clinic Welcome Documents ────────────────────────────────────────────────

export interface ClinicWelcomeDocument {
  documentId: string;
  fileName: string;
  mimeType: string | null;
  size: number;
  version: number;
  versions: Array<{
    version: number;
    fileName: string;
    mimeType: string | null;
    size: number;
    uploadedByName: string | null;
    createdAt: string;
  }>;
  downloadCount: number;
  lastDownloadedAt: string | null;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
}

export interface ClinicWelcomeDocumentsList {
  documents: ClinicWelcomeDocument[];
}

export function listClinicWelcomeDocuments(
  clinicId: string,
  query: { q?: string } = {}
): Promise<ClinicWelcomeDocumentsList> {
  tenantPath(clinicId, "");
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return request(`/api/clinics/me/welcome-documents${qs ? `?${qs}` : ""}`, { cache: "no-store" });
}

export function uploadClinicWelcomeDocument(
  clinicId: string,
  file: File
): Promise<ClinicWelcomeDocument> {
  tenantPath(clinicId, "");
  const form = new FormData();
  form.append("file", file);

  const headers: Record<string, string> = {};
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${API_BASE}/api/clinics/me/welcome-documents`, {
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
  }).then(async (res) => {
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
    return data as ClinicWelcomeDocument;
  });
}

export function getClinicWelcomeDocumentDownloadUrl(
  clinicId: string,
  documentId: string
): Promise<{ url: string; fileName: string; mimeType: string | null }> {
  tenantPath(clinicId, "");
  return request(`/api/clinics/me/welcome-documents/${documentId}/download`, { cache: "no-store" });
}

export function deleteClinicWelcomeDocument(
  clinicId: string,
  documentId: string
): Promise<{ ok: true }> {
  tenantPath(clinicId, "");
  return request(`/api/clinics/me/welcome-documents/${documentId}`, { method: "DELETE" });
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

/** Live WhatsApp session state  bypasses the GET cache for polling. */
export function getWhatsappSession(): Promise<WhatsappSession> {
  return request("/api/whatsapp/session", { cache: "no-store" });
}

// ── Per-clinic WhatsApp connection ─────────────────────────────────────────

export type ClinicWhatsappStage =
  | "unconfigured"
  | "idle"
  | "qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "error";

export interface ClinicWhatsappSession {
  stage: ClinicWhatsappStage;
  connected: boolean;
  updatedAt: string | null;
  phone: string | null;
  enabled: boolean;
  lastConnectedAt: string | null;
  qr: { dataUrl: string; generatedAt: string } | null;
}

/** This clinic's own WhatsApp Web connection state (QR pairing, etc.). */
export function getClinicWhatsappSession(clinicId: string): Promise<ClinicWhatsappSession> {
  return request(tenantPath(clinicId, "/whatsapp/session"), { cache: "no-store" });
}

/** Starts (or re-pairs) this clinic's WhatsApp connection  the QR appears within a few seconds. */
export function connectClinicWhatsapp(clinicId: string): Promise<{ ok: true; status: string }> {
  return request(tenantPath(clinicId, "/whatsapp/session/connect"), { method: "POST" });
}

/**
 * Stops this clinic's WhatsApp connection. With `logout` the paired device is
 * unlinked and the session wiped  the next connect requires a fresh QR scan.
 */
export function disconnectClinicWhatsapp(
  clinicId: string,
  logout = false
): Promise<{ ok: true; status: string }> {
  return request(tenantPath(clinicId, "/whatsapp/session/disconnect"), {
    method: "POST",
    body: JSON.stringify({ logout }),
  });
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

export interface WhatsappBroadcastResult {
  targeted: number;
  queued: number;
  messagesQueued: number;
  skippedNoPhone: number;
}

/**
 * Sends a WhatsApp notification (optionally with attachments) to the given
 * patients  or every active patient when `allPatients` is set. Multipart
 * upload, so attachments travel inline with the form fields.
 */
export async function sendWhatsappBroadcast(
  clinicId: string,
  input: {
    allPatients: boolean;
    patientIds: string[];
    type: string;
    title: string;
    message: string;
  },
  files: File[]
): Promise<WhatsappBroadcastResult> {
  const form = new FormData();
  form.append("all", String(input.allPatients));
  form.append("patientIds", JSON.stringify(input.patientIds));
  form.append("type", input.type);
  form.append("title", input.title);
  form.append("message", input.message);
  for (const file of files) {
    form.append("attachments", file, file.name);
  }

  const headers: Record<string, string> = {};
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${tenantPath(clinicId, "/notifications/whatsapp")}`, {
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
    throw new ClinicApiError(err.error ?? `Request failed (${res.status})`, res.status);
  }
  return data as WhatsappBroadcastResult;
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
  params.set("limit", String(query.limit ?? 50));
  return request(tenantPath(clinicId, `/audit-logs?${params}`));
}

// ── Patient portal (own data only) ─────────────────────────────────────────

export function myAppointments(clinicId: string, query: { status?: string; limit?: number } = {}): Promise<PageResult<Appointment>> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 50));
  return request(tenantPath(clinicId, `/me/appointments?${params}`));
}

export function bookAppointment(
  clinicId: string,
  input: {
    doctorId: string;
    date: string;
    time: string;
    reason?: string | null;
    notes?: string | null;
  }
): Promise<Appointment> {
  return request(tenantPath(clinicId, "/me/appointments"), {
    method: "POST",
    body: JSON.stringify(input),
  });
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

// ── Platform admin ─────────────────────────────────────────────────────────

export function listAllClinics(
  query: { status?: string; q?: string; limit?: number } = {}
): Promise<PageResult<Clinic>> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  params.set("limit", String(query.limit ?? 50));
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

export interface ClinicStats {
  clinicId: string;
  doctors: number;
  staff: number;
  patients: number;
  appointments: number;
  medicalRecords: number;
  prescriptions: number;
  bills: number;
  users: number;
}

export function getClinicStats(clinicId: string): Promise<ClinicStats> {
  return request(`/api/clinics/${clinicId}/stats`);
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
// ── Meta Business Integration ──────────────────────────────────────────────

export interface MetaIntegrationPublic {
  integrationId: string;
  metaBusinessId: string | null;
  metaBusinessName: string | null;
  status: string;
  webhookStatus: string;
  grantedScopes: string[];
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasToken: boolean;
}

export interface MetaHealth {
  status: string;
  tokenExpiring: boolean;
  tokenExpired: boolean;
  webhookStatus: string;
  lastSyncedAt: string | null;
  missingScopes: string[];
  issues: string[];
}

export interface MetaAssets {
  pages: Array<{ pageId: string; pageName: string; category: string | null; status: string }>;
  instagram: Array<{ instagramAccountId: string; username: string | null; name: string | null; status: string }>;
  adAccounts: Array<{ adAccountId: string; name: string | null; accountId: string | null; currency: string | null; status: string }>;
  leadForms: Array<{ formId: string; metaPageId: string; formName: string; status: string }>;
  whatsapp: Array<{ waBusinessId: string; name: string | null; phoneNumberId: string | null; status: string }>;
}

export interface MetaCampaignMapping {
  mappingId: string;
  metaCampaignId: string;
  metaCampaignName: string | null;
  department: string | null;
  service: string | null;
  team: string | null;
  doctorId: string | null;
  pipeline: string | null;
}

export interface MetaSyncJob {
  syncJobId: string;
  mode: string;
  fromDate: string | null;
  toDate: string | null;
  status: string;
  found: number;
  imported: number;
  duplicates: number;
  failed: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface MetaWebhookEvent {
  eventId: string;
  eventType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface MetaAnalytics {
  totalMetaLeads: number;
  byPlatform: { facebook: number; instagram: number; unknown: number };
  byCampaign: Array<{ campaignId: string | null; campaignName: string | null; leads: number; appointments: number; converted: number; conversionRate: number }>;
  byAdSet: Array<{ adsetId: string | null; adsetName: string | null; leads: number }>;
  byAd: Array<{ adId: string | null; adName: string | null; leads: number }>;
  byForm: Array<{ formId: string | null; formName: string | null; leads: number }>;
  appointmentsGenerated: number;
  convertedLeads: number;
  conversionRate: number;
  costPerLead: null;
  costPerAppointment: null;
  costPerConversion: null;
}

export function getMetaStatus(clinicId: string): Promise<{ integration: MetaIntegrationPublic | null; health: MetaHealth }> {
  return request(tenantPath(clinicId, "/meta/status"));
}
export interface ConnectMetaInput {
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
}

export function connectMeta(
  clinicId: string,
  input: ConnectMetaInput = {}
): Promise<{ authUrl: string; state: string }> {
  return request(tenantPath(clinicId, "/meta/connect"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function reconnectMeta(clinicId: string): Promise<{ authUrl: string; state: string }> {
  return request(tenantPath(clinicId, "/meta/reconnect"), { method: "POST" });
}
export function disconnectMeta(clinicId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, "/meta/disconnect"), { method: "POST" });
}
export function getMetaAssets(clinicId: string): Promise<MetaAssets> {
  return request(tenantPath(clinicId, "/meta/assets"));
}
export function listCampaignMappings(clinicId: string): Promise<{ mappings: MetaCampaignMapping[] }> {
  return request(tenantPath(clinicId, "/meta/campaign-mappings"));
}
export function upsertCampaignMapping(clinicId: string, input: Partial<MetaCampaignMapping>): Promise<MetaCampaignMapping> {
  return request(tenantPath(clinicId, "/meta/campaign-mappings"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function deleteCampaignMapping(clinicId: string, mappingId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/meta/campaign-mappings/${mappingId}`), { method: "DELETE" });
}
export function syncMetaNow(clinicId: string): Promise<MetaSyncJob> {
  return request(tenantPath(clinicId, "/meta/sync"), { method: "POST" });
}
export function syncMetaRange(clinicId: string, fromDate: string, toDate: string): Promise<MetaSyncJob> {
  return request(tenantPath(clinicId, "/meta/sync/range"), {
    method: "POST",
    body: JSON.stringify({ fromDate, toDate }),
  });
}
export function listMetaSyncJobs(clinicId: string): Promise<{ jobs: MetaSyncJob[] }> {
  return request(tenantPath(clinicId, "/meta/sync/jobs"));
}
export function getMetaAnalytics(clinicId: string): Promise<MetaAnalytics> {
  return request(tenantPath(clinicId, "/meta/analytics"));
}
export function listMetaWebhookEvents(clinicId: string): Promise<{ events: MetaWebhookEvent[] }> {
  return request(tenantPath(clinicId, "/meta/webhook-events"));
}
export function retryMetaWebhooks(clinicId: string): Promise<{ retried: number; stillFailing: number }> {
  return request(tenantPath(clinicId, "/meta/webhook-events/retry"), { method: "POST" });
}

// ── Leads ────────────────────────────────────────────────────────────────────

export interface Lead {
  leadId: string;
  source: string;
  sourceRef: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  formAnswers: Record<string, string>;
  consent: Record<string, unknown> | null;
  status: string;
  priority: string;
  department: string | null;
  service: string | null;
  team: string | null;
  assignedTo: string | null;
  assignedAt: string | null;
  receivedAt: string;
  firstResponseAt: string | null;
  firstContactAt: string | null;
  contactAttempts: number;
  appointmentBookedAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAttribution {
  metaLeadId: string | null;
  businessId: string | null;
  pageId: string | null;
  instagramAccountId: string | null;
  adAccountId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
  formId: string | null;
  formName: string | null;
  platform: string;
  submittedAt: string | null;
}

export function listLeads(clinicId: string, query: { status?: string } = {}): Promise<{ leads: Lead[] }> {
  const qs = query.status ? `?status=${encodeURIComponent(query.status)}` : "";
  return request(tenantPath(clinicId, `/leads${qs}`));
}
export function createLead(clinicId: string, input: Partial<Lead>): Promise<Lead> {
  return request(tenantPath(clinicId, "/leads"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function getLead(clinicId: string, leadId: string): Promise<{ lead: Lead; attribution: LeadAttribution | null; whatsappFollowup: unknown | null }> {
  return request(tenantPath(clinicId, `/leads/${leadId}`));
}
export function assignLead(clinicId: string, leadId: string, assignedTo: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/leads/${leadId}/assign`), {
    method: "POST",
    body: JSON.stringify({ assignedTo }),
  });
}
export function markLeadContacted(clinicId: string, leadId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/leads/${leadId}/contacted`), { method: "POST" });
}
export function bookLeadAppointment(clinicId: string, leadId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/leads/${leadId}/appointment`), { method: "POST" });
}
export function convertLead(clinicId: string, leadId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/leads/${leadId}/convert`), { method: "POST" });
}
export function getLeadWorkflowStats(clinicId: string): Promise<{
  totalLeads: number;
  metaLeads: number;
  appointmentsBooked: number;
  converted: number;
  avgFirstResponseMs: number | null;
  leadToAppointmentRate: number;
}> {
  return request(tenantPath(clinicId, "/leads/stats/workflow"));
}
export function upsertLeadWhatsappFollowup(clinicId: string, leadId: string, input: Record<string, unknown>): Promise<unknown> {
  return request(tenantPath(clinicId, `/leads/${leadId}/whatsapp-followup`), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── Platform admin Meta oversight ────────────────────────────────────────────

export function getPlatformMetaOverview(): Promise<{
  connectedClinics: number;
  totalIntegrations: number;
  byStatus: Record<string, number>;
  integrations: Array<{
    clinicId: string;
    metaBusinessId: string | null;
    metaBusinessName: string | null;
    status: string;
    webhookStatus: string;
    lastSyncedAt: string | null;
    tokenExpiresAt: string | null;
    hasToken: boolean;
  }>;
  webhookErrors: MetaWebhookEvent[];
}> {
  return request("/api/platform/meta/overview");
}

// ── Pharmacy Management ──────────────────────────────────────────────────────

export interface PharmacyOperatingHour {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}
export interface PharmacyDispensingSettings {
  allowSubstitution: boolean;
  requirePrescription: boolean;
  defaultTaxPercent: number;
  rounding: "none" | "nearest_rupee";
}
export interface PharmacyInvoiceConfig {
  prefix: string;
  nextNumber: number;
  footerNote: string | null;
}
export interface PharmacySettings {
  clinicId: string;
  pharmacyId: string;
  pharmacyName: string | null;
  registrationNumber: string | null;
  licenseNumber: string | null;
  gstNumber: string | null;
  taxId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  pharmacistName: string | null;
  pharmacistRegistration: string | null;
  operatingHours: PharmacyOperatingHour[];
  dispensingSettings: PharmacyDispensingSettings;
  invoiceConfig: PharmacyInvoiceConfig;
  paymentMethods: string[];
  supplierInfo: string | null;
  pharmacyStatus: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
export interface PharmacyMedicine {
  clinicId: string;
  medicineId: string;
  name: string;
  genericName: string | null;
  brand: string | null;
  category: string | null;
  dosageForm: string | null;
  strength: string | null;
  unit: string | null;
  manufacturer: string | null;
  hsnCode: string | null;
  barcode: string | null;
  batchNumber: string | null;
  prescriptionRequired: boolean;
  reorderLevel: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  purchasePrice: number;
  sellingPrice: number;
  taxPercent: number;
  discount: number;
  supplierId: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  storageConditions: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
export interface PharmacyInventory {
  inventoryId: string;
  medicineId: string;
  name: string;
  genericName: string | null;
  category: string | null;
  batchNumber: string;
  barcode: string | null;
  quantityAvailable: number;
  quantityReserved: number;
  quantityDamaged: number;
  purchasePrice: number;
  sellingPrice: number;
  taxPercent: number;
  expiryDate: string | null;
  manufacturingDate: string | null;
  supplierId: string | null;
  storageLocation: string | null;
  reorderLevel: number;
  status: "in_stock" | "low_stock" | "out_of_stock" | "near_expiry" | "expired";
  reorderStatus: "ok" | "reorder";
  lastUpdated: string;
  supplierName?: string | null;
}
export interface PharmacyMovement {
  movementId: string;
  transactionId: string;
  medicineId: string;
  batchNumber: string;
  quantityBefore: number;
  quantityChanged: number;
  quantityAfter: number;
  movementType: string;
  referenceInvoice: string | null;
  party: string | null;
  performedBy: string | null;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  medicineName?: string;
}
export interface PharmacySupplier {
  supplierId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  drugLicenseNumber: string | null;
  paymentTerms: string | null;
  notes: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
export interface PharmacyPurchaseItem {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  expiryDate: string | null;
  manufacturingDate: string | null;
  supplierId: string | null;
  storageLocation: string | null;
}
export interface PharmacyPurchase {
  purchaseId: string;
  invoiceNumber: string;
  supplierId: string | null;
  purchaseDate: string;
  items: PharmacyPurchaseItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: "draft" | "received" | "cancelled";
  receivedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PharmacySaleItem {
  medicineId: string;
  batchNumber: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
}
export interface PharmacySale {
  saleId: string;
  invoiceNumber: string;
  saleDate: string;
  patientId: string | null;
  items: PharmacySaleItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "cancelled" | "refunded";
  soldBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PharmacyAdjustment {
  adjustmentId: string;
  medicineId: string;
  batchNumber: string;
  currentQuantity: number;
  newQuantity: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PharmacyTransferItem {
  medicineId: string;
  batchNumber: string;
  quantity: number;
}
export interface PharmacyTransfer {
  transferId: string;
  fromLocation: string;
  toLocation: string;
  items: PharmacyTransferItem[];
  status: "pending" | "approved" | "rejected" | "completed";
  requestedBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PharmacyReturnItem {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  reason: string | null;
}
export interface PharmacyReturn {
  returnId: string;
  type: "supplier_return" | "customer_return";
  referenceId: string | null;
  items: PharmacyReturnItem[];
  processedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PharmacyDashboard {
  totalMedicines: number;
  totalStockValue: number;
  lowStock: number;
  outOfStock: number;
  nearExpiry: number;
  expired: number;
  todaySales: { count: number; value: number };
  purchaseValue: number;
  stockMovementsToday: number;
  reorderCount: number;
}
export interface PharmacyAlerts {
  lowStock: PharmacyInventory[];
  outOfStock: PharmacyInventory[];
  nearExpiry: PharmacyInventory[];
  expired: PharmacyInventory[];
  reorderSuggestions: Array<{
    inventoryId: string;
    medicineId: string;
    name: string;
    batchNumber: string;
    available: number;
    reorderLevel: number;
    suggested: number;
  }>;
}

function pharmacyQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function getPharmacySettings(clinicId: string): Promise<PharmacySettings | null> {
  return request(tenantPath(clinicId, "/pharmacy/settings"));
}
export function updatePharmacySettings(
  clinicId: string,
  input: Record<string, unknown>
): Promise<PharmacySettings> {
  return request(tenantPath(clinicId, "/pharmacy/settings"), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function listMedicines(
  clinicId: string,
  query: { search?: string; category?: string; status?: string; supplierId?: string; limit?: number } = {}
): Promise<{ items: PharmacyMedicine[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/medicines${pharmacyQuery(query)}`));
}
export function getMedicine(clinicId: string, medicineId: string): Promise<PharmacyMedicine> {
  return request(tenantPath(clinicId, `/pharmacy/medicines/${medicineId}`));
}
export function createMedicine(clinicId: string, input: Record<string, unknown>): Promise<PharmacyMedicine> {
  return request(tenantPath(clinicId, "/pharmacy/medicines"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function updateMedicine(
  clinicId: string,
  medicineId: string,
  input: Record<string, unknown>
): Promise<PharmacyMedicine> {
  return request(tenantPath(clinicId, `/pharmacy/medicines/${medicineId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deleteMedicine(clinicId: string, medicineId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/pharmacy/medicines/${medicineId}`), { method: "DELETE" });
}
export function bulkMedicines(
  clinicId: string,
  input: { ids: string[]; action: "activate" | "deactivate" | "delete" }
): Promise<{ modified: number }> {
  return request(tenantPath(clinicId, "/pharmacy/medicines/bulk"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function listInventory(
  clinicId: string,
  query: Record<string, unknown> = {}
): Promise<{ items: PharmacyInventory[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/inventory${pharmacyQuery(query)}`));
}
export function getInventory(clinicId: string, inventoryId: string): Promise<PharmacyInventory> {
  return request(tenantPath(clinicId, `/pharmacy/inventory/${inventoryId}`));
}
export function addOpeningStock(
  clinicId: string,
  items: PharmacyPurchaseItem[],
  notes?: string | null
): Promise<{ created: number }> {
  return request(tenantPath(clinicId, "/pharmacy/inventory/opening-stock"), {
    method: "POST",
    body: JSON.stringify({ items, notes: notes ?? null }),
  });
}
export function writeOffStock(
  clinicId: string,
  input: Record<string, unknown>
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, "/pharmacy/inventory/write-off"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function listMovements(
  clinicId: string,
  query: Record<string, unknown> = {}
): Promise<{ items: PharmacyMovement[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/movements${pharmacyQuery(query)}`));
}
export function listSuppliers(
  clinicId: string,
  query: { search?: string; status?: string; limit?: number } = {}
): Promise<{ items: PharmacySupplier[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/suppliers${pharmacyQuery(query)}`));
}
export function getSupplier(clinicId: string, supplierId: string): Promise<PharmacySupplier> {
  return request(tenantPath(clinicId, `/pharmacy/suppliers/${supplierId}`));
}
export function createSupplier(clinicId: string, input: Record<string, unknown>): Promise<PharmacySupplier> {
  return request(tenantPath(clinicId, "/pharmacy/suppliers"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function updateSupplier(
  clinicId: string,
  supplierId: string,
  input: Record<string, unknown>
): Promise<PharmacySupplier> {
  return request(tenantPath(clinicId, `/pharmacy/suppliers/${supplierId}`), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deleteSupplier(clinicId: string, supplierId: string): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/pharmacy/suppliers/${supplierId}`), { method: "DELETE" });
}
export function listPurchases(
  clinicId: string,
  query: Record<string, unknown> = {}
): Promise<{ items: PharmacyPurchase[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/purchases${pharmacyQuery(query)}`));
}
export function getPurchase(clinicId: string, purchaseId: string): Promise<PharmacyPurchase> {
  return request(tenantPath(clinicId, `/pharmacy/purchases/${purchaseId}`));
}
export function createPurchase(clinicId: string, input: Record<string, unknown>): Promise<PharmacyPurchase> {
  return request(tenantPath(clinicId, "/pharmacy/purchases"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function receivePurchase(
  clinicId: string,
  purchaseId: string,
  notes?: string | null
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/pharmacy/purchases/${purchaseId}/receive`), {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? null }),
  });
}
export function listSales(
  clinicId: string,
  query: Record<string, unknown> = {}
): Promise<{ items: PharmacySale[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/sales${pharmacyQuery(query)}`));
}
export function getSale(clinicId: string, saleId: string): Promise<PharmacySale> {
  return request(tenantPath(clinicId, `/pharmacy/sales/${saleId}`));
}
export function createSale(clinicId: string, input: Record<string, unknown>): Promise<PharmacySale> {
  return request(tenantPath(clinicId, "/pharmacy/sales"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function listAdjustments(
  clinicId: string,
  query: { status?: string; limit?: number } = {}
): Promise<{ items: PharmacyAdjustment[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/adjustments${pharmacyQuery(query)}`));
}
export function createAdjustment(clinicId: string, input: Record<string, unknown>): Promise<PharmacyAdjustment> {
  return request(tenantPath(clinicId, "/pharmacy/adjustments"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function reviewAdjustment(
  clinicId: string,
  adjustmentId: string,
  decision: "approved" | "rejected",
  notes?: string | null
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/pharmacy/adjustments/${adjustmentId}/review`), {
    method: "POST",
    body: JSON.stringify({ decision, notes: notes ?? null }),
  });
}
export function listTransfers(
  clinicId: string,
  query: { status?: string; limit?: number } = {}
): Promise<{ items: PharmacyTransfer[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/transfers${pharmacyQuery(query)}`));
}
export function createTransfer(clinicId: string, input: Record<string, unknown>): Promise<PharmacyTransfer> {
  return request(tenantPath(clinicId, "/pharmacy/transfers"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function reviewTransfer(
  clinicId: string,
  transferId: string,
  decision: "approved" | "rejected" | "completed",
  notes?: string | null
): Promise<{ ok: true }> {
  return request(tenantPath(clinicId, `/pharmacy/transfers/${transferId}/review`), {
    method: "POST",
    body: JSON.stringify({ decision, notes: notes ?? null }),
  });
}
export function listReturns(
  clinicId: string,
  query: { type?: string; limit?: number } = {}
): Promise<{ items: PharmacyReturn[]; total: number }> {
  return request(tenantPath(clinicId, `/pharmacy/returns${pharmacyQuery(query)}`));
}
export function createReturn(clinicId: string, input: Record<string, unknown>): Promise<PharmacyReturn> {
  return request(tenantPath(clinicId, "/pharmacy/returns"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function getPharmacyDashboard(clinicId: string): Promise<PharmacyDashboard> {
  return request(tenantPath(clinicId, "/pharmacy/dashboard"));
}
export function getPharmacyAlerts(clinicId: string): Promise<PharmacyAlerts> {
  return request(tenantPath(clinicId, "/pharmacy/alerts"));
}
export async function downloadPharmacyReport(
  clinicId: string,
  query: { type: string; from?: string; to?: string; category?: string; supplierId?: string; format?: string }
): Promise<void> {
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${API_BASE}${tenantPath(clinicId, `/pharmacy/reports${pharmacyQuery(query)}`)}`;
  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  if (!res.ok) {
    let message = "Failed to generate report";
    try {
      const body = await res.json();
      message = (body as { error?: string; message?: string }).message ?? message;
    } catch {
      /* ignore */
    }
    throw new ClinicApiError(message, res.status, "REPORT_FAILED");
  }
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? "pharmacy-report";
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
