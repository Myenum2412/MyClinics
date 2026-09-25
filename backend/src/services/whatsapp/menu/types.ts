/**
 * Menu chatbot types. The bot is a deterministic state machine (no LLM):
 * every reply is derived from the patient's message, the stored state and
 * the clinic's own data.
 */
export type MenuStep =
  | "MENU"
  | "PICK_PATIENT"
  | "DOCTOR"
  | "DATE"
  | "TIME"
  | "CONFIRM"
  | "MANAGE_PICK"
  | "MANAGE_ACTION"
  | "CANCEL_CONFIRM"
  | "REPORTS_PICK"
  | "HANDOFF";

export type MenuAction = "book" | "manage" | "mine" | "info" | "reports" | "staff";

export interface PatientRef {
  id: string;
  name: string;
}
export interface DoctorRef {
  id: string;
  name: string;
  specialization: string | null;
}
export interface ApptRef {
  id: string;
  doctorId: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}
export interface DocRef {
  id: string;
  kind: "file" | "rx";
  label: string;
}

/** Everything a flow needs to remember between messages. */
export interface FlowData {
  flow?: "book" | "resched";
  /** Action waiting for the patient to choose who it is for. */
  next?: "book" | "manage" | "mine" | "reports";
  patients?: PatientRef[];
  /** null = number not registered yet: the patient record is created when the booking is confirmed. */
  patientId?: string | null;
  patientName?: string;
  doctors?: DoctorRef[];
  doctorId?: string;
  doctorName?: string;
  dates?: string[];
  date?: string;
  slots?: string[];
  slotPage?: number;
  time?: string;
  appts?: ApptRef[];
  appt?: ApptRef;
  files?: DocRef[];
  /** The last prompt sent; repeated when the patient answers something invalid. */
  lastPrompt?: string;
}

export interface MenuState {
  step: MenuStep;
  data: FlowData;
  updatedAt: number;
  /** While in the future (HANDOFF), the bot stays silent so staff can reply. */
  handoffUntil?: number;
  /** Last processed WhatsApp message id and the replies it produced (safe replay on webhook retry). */
  lastMessageId?: string;
  lastReplies?: string[];
}

export type BookResult =
  | { ok: true; token: number | null }
  | { ok: false; reason: "SLOT_TAKEN" | "FAILED" };
export type ChangeResult = { ok: true } | { ok: false; reason: "SLOT_TAKEN" | "NOT_FOUND" | "FAILED" };
export type OpenDocResult =
  | { kind: "text"; text: string }
  | { kind: "file_sent" }
  | { kind: "error"; reason: "missing" | "too_large" | "failed" };

/** Data access the engine needs. Implemented against MongoDB in menu.tenant.ts and faked in tests. */
export interface MenuDeps {
  clinicName: string;
  now(): number;
  /** Today's date in the clinic timezone, YYYY-MM-DD. */
  today(): string;
  findPatients(): Promise<PatientRef[]>;
  listDoctors(): Promise<DoctorRef[]>;
  /** Upcoming dates (next 7 days) on which the doctor still has a free slot. */
  availableDates(doctorId: string): Promise<string[]>;
  /** Free HH:mm slots for the doctor on that date, earliest first. */
  freeSlots(doctorId: string, date: string): Promise<string[]>;
  book(a: { patientId: string | null; patientName: string; doctorId: string; date: string; time: string }): Promise<BookResult>;
  listUpcoming(patientId: string): Promise<ApptRef[]>;
  reschedule(a: { patientId: string; appointmentId: string; date: string; time: string }): Promise<ChangeResult>;
  cancel(a: { patientId: string; appointmentId: string }): Promise<ChangeResult>;
  /** Pre-formatted address / phone / hours block, or null when the clinic has none configured. */
  clinicInfo(): Promise<string | null>;
  listDocuments(patientId: string): Promise<DocRef[]>;
  openDocument(patientId: string, doc: DocRef): Promise<OpenDocResult>;
  requestStaff(a: { patientName: string | null }): Promise<void>;
}

export interface InboundText {
  text: string;
  type: string;
  pushName: string | null;
}

export interface MenuOutcome {
  replies: string[];
  state: MenuState | null;
}
