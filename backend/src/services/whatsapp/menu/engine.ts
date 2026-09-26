import type {
  ApptRef,
  DoctorRef,
  FlowData,
  InboundText,
  MenuAction,
  MenuDeps,
  MenuOutcome,
  MenuState,
  MenuStep,
  PatientRef,
} from "@/services/whatsapp/menu/types";
import { BACK_LINE, T } from "@/services/whatsapp/menu/texts";

/**
 * Deterministic WhatsApp menu chatbot. No LLM: every reply is a pure function of
 * the message, the stored state and the clinic's data (via `MenuDeps`).
 */
export const IDLE_MS = 30 * 60_000;
export const HANDOFF_MS = 2 * 60 * 60_000;
export const SLOT_PAGE_SIZE = 8;

const GREETING =
  /^(hi+|hello+|hey+|helo|hlo|hai|hola|namaste|vanakkam|good\s+(morning|afternoon|evening)|gm|start|menu|main\s+menu|home)(\s+(there|team|sir|madam|doctor|clinic))?[\s!.]*$/i;

const KEYWORDS: [RegExp, MenuAction][] = [
  [/\b(staff|human|agent|receptionist|talk to|speak to|call me|callback)\b/i, "staff"],
  [/\b(cancel|reschedule|postpone|rebook)\b|\bchange\b.*\b(appointment|time|slot)\b/i, "manage"],
  [/\bmy (appointment|booking)s?\b|\bupcoming\b|\bappointment status\b/i, "mine"],
  [/\b(reports?|prescriptions?|records?|lab|results?|scan|x-?ray)\b/i, "reports"],
  [/\b(book|booking|appointment|appoinment|schedule|consult(ation)?|visit|slot)\b/i, "book"],
  [/\b(timings?|hours|open|closing|location|address|where|directions?|contact|phone)\b/i, "info"],
];

const NUMBER_ACTIONS: MenuAction[] = ["book", "manage", "mine", "info", "reports", "staff"];

const normalize = (t: string): string => t.trim().replace(/\s+/g, " ");
const isMenuCommand = (t: string): boolean => t === "0" || GREETING.test(t);

function numericChoice(t: string): number | null {
  const m = t.match(/^(\d{1,2})[.)]?$/);
  return m ? Number(m[1]) : null;
}

/** For yes/no style steps: numbers plus yes/no words (1 = yes/confirm, 2 = no/change). */
function confirmChoice(t: string): number | null {
  const n = numericChoice(t);
  if (n !== null) return n;
  const w = t.toLowerCase();
  if (/^(yes|y|ok|okay|confirm|sure|haan|aama)$/.test(w)) return 1;
  if (/^(no|n|nope|nah|illai)$/.test(w)) return 2;
  return null;
}

interface Ctx {
  deps: MenuDeps;
  input: InboundText;
}

const ask = (ctx: Ctx, step: MenuStep, data: FlowData, text: string): MenuOutcome => ({
  replies: [text],
  state: { step, data: { ...data, lastPrompt: text }, updatedAt: ctx.deps.now() },
});

/** Ends a flow: shows `text` and lets the patient type a menu number (1–6) next. */
const endFlow = (ctx: Ctx, text: string): MenuOutcome => ask(ctx, "MENU", {}, text);

async function showMenu(ctx: Ctx, prefix = ""): Promise<MenuOutcome> {
  return ask(ctx, "MENU", {}, prefix + T.menu(ctx.deps.clinicName, ctx.input.pushName));
}

export async function handleMenuMessage(
  input: InboundText,
  previous: MenuState | null,
  deps: MenuDeps
): Promise<MenuOutcome> {
  const ctx: Ctx = { deps, input };
  const now = deps.now();
  let state = previous;

  if (state && state.step !== "HANDOFF" && now - state.updatedAt > IDLE_MS) state = null;

  const text = normalize(input.text);

  if (state?.step === "HANDOFF") {
    if ((state.handoffUntil ?? 0) > now && !isMenuCommand(text)) {
      return { replies: [], state }; // staff are handling this chat; stay silent
    }
    state = null;
  }

  if (input.type !== "text" || !text) return showMenu(ctx, T.textOnly);
  if (isMenuCommand(text)) return showMenu(ctx);

  if (!state) {
    const action = keywordAction(text);
    return action ? startAction(ctx, action) : showMenu(ctx, T.didntUnderstand);
  }

  switch (state.step) {
    case "MENU": {
      const n = numericChoice(text);
      const action = n !== null ? NUMBER_ACTIONS[n - 1] : keywordAction(text);
      return action ? startAction(ctx, action) : showMenu(ctx, T.didntUnderstand);
    }
    case "PICK_PATIENT":
      return onPickPatient(ctx, state, text);
    case "DOCTOR":
      return onPickDoctor(ctx, state, text);
    case "DATE":
      return onPickDate(ctx, state, text);
    case "TIME":
      return onPickTime(ctx, state, text);
    case "CONFIRM":
      return onConfirm(ctx, state, text);
    case "MANAGE_PICK":
      return onManagePick(ctx, state, text);
    case "MANAGE_ACTION":
      return onManageAction(ctx, state, text);
    case "CANCEL_CONFIRM":
      return onCancelConfirm(ctx, state, text);
    case "REPORTS_PICK":
      return onReportsPick(ctx, state, text);
    default:
      return showMenu(ctx);
  }
}

function keywordAction(text: string): MenuAction | null {
  for (const [re, action] of KEYWORDS) if (re.test(text)) return action;
  return null;
}

/** Re-asks the current question when the answer isn't one of the offered options. */
function invalid(ctx: Ctx, state: MenuState): MenuOutcome {
  return {
    replies: [T.invalid + (state.data.lastPrompt ?? "")],
    state: { ...state, updatedAt: ctx.deps.now() },
  };
}

// ── Entry points from the main menu ────────────────────────────────────────

async function startAction(ctx: Ctx, action: MenuAction): Promise<MenuOutcome> {
  switch (action) {
    case "info": {
      const info = await ctx.deps.clinicInfo();
      const body = info ?? "Please contact the clinic directly for timings and location.";
      return endFlow(ctx, `${body}\n\n1️⃣ Book an appointment\n${BACK_LINE}`);
    }
    case "staff": {
      await ctx.deps.requestStaff({ patientName: ctx.input.pushName });
      return {
        replies: [T.staffNotified(ctx.input.pushName)],
        state: {
          step: "HANDOFF",
          data: {},
          updatedAt: ctx.deps.now(),
          handoffUntil: ctx.deps.now() + HANDOFF_MS,
        },
      };
    }
    default:
      return withPatient(ctx, action);
  }
}

async function withPatient(ctx: Ctx, action: "book" | "manage" | "mine" | "reports"): Promise<MenuOutcome> {
  const patients = await ctx.deps.findPatients();

  if (patients.length === 0) {
    if (action === "book") {
      return beginBooking(ctx, { patientId: null, patientName: ctx.input.pushName ?? "Patient" });
    }
    return endFlow(ctx, T.noRecords);
  }
  if (patients.length === 1) return proceed(ctx, action, patients[0]);

  return ask(ctx, "PICK_PATIENT", { next: action, patients }, T.pickPatient(patients));
}

async function proceed(ctx: Ctx, action: "book" | "manage" | "mine" | "reports", patient: PatientRef): Promise<MenuOutcome> {
  switch (action) {
    case "book":
      return beginBooking(ctx, { patientId: patient.id, patientName: patient.name });
    case "manage": {
      const appts = await ctx.deps.listUpcoming(patient.id);
      if (appts.length === 0) return endFlow(ctx, T.noUpcoming);
      return ask(ctx, "MANAGE_PICK", { patientId: patient.id, patientName: patient.name, appts }, T.pickAppointment(appts, ctx.deps.today()));
    }
    case "mine": {
      const appts = await ctx.deps.listUpcoming(patient.id);
      return endFlow(ctx, T.upcoming(appts, ctx.deps.today()));
    }
    case "reports": {
      const files = await ctx.deps.listDocuments(patient.id);
      if (files.length === 0) return endFlow(ctx, T.noDocuments);
      return ask(ctx, "REPORTS_PICK", { patientId: patient.id, patientName: patient.name, files }, T.pickDocument(files));
    }
  }
}

async function onPickPatient(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = numericChoice(text);
  const patient = n !== null ? state.data.patients?.[n - 1] : undefined;
  const next = state.data.next;
  if (!patient || !next) return invalid(ctx, state);
  return proceed(ctx, next, patient);
}

// ── Booking / rescheduling ──────────────────────────────────────────────────

async function beginBooking(ctx: Ctx, who: { patientId: string | null; patientName: string }): Promise<MenuOutcome> {
  const doctors = await ctx.deps.listDoctors();
  if (doctors.length === 0) return endFlow(ctx, T.noDoctors(null));
  const base: FlowData = { flow: "book", ...who, doctors };
  if (doctors.length === 1) return chooseDoctor(ctx, base, doctors[0]);
  return ask(ctx, "DOCTOR", base, T.pickDoctor(doctors));
}

async function chooseDoctor(ctx: Ctx, data: FlowData, doctor: DoctorRef): Promise<MenuOutcome> {
  const dates = await ctx.deps.availableDates(doctor.id);
  const next: FlowData = { ...data, doctorId: doctor.id, doctorName: doctor.name, dates };
  if (dates.length === 0) {
    const many = (data.doctors?.length ?? 0) > 1;
    return ask(ctx, many ? "DOCTOR" : "MENU", many ? data : {}, T.noDates(doctor.name, many));
  }
  return ask(ctx, "DATE", next, T.pickDate(doctor.name, dates, ctx.deps.today()));
}

async function onPickDoctor(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = numericChoice(text);
  const doctor = n !== null ? state.data.doctors?.[n - 1] : undefined;
  if (!doctor) return invalid(ctx, state);
  return chooseDoctor(ctx, state.data, doctor);
}

async function showSlots(ctx: Ctx, data: FlowData, page: number, prefix = ""): Promise<MenuOutcome> {
  const slots = await ctx.deps.freeSlots(data.doctorId!, data.date!);
  if (slots.length === 0) {
    // Everything was taken meanwhile: offer other days.
    const dates = (await ctx.deps.availableDates(data.doctorId!)).filter((d) => d !== data.date);
    if (dates.length === 0) return endFlow(ctx, T.noDates(data.doctorName!, false));
    return ask(ctx, "DATE", { ...data, dates }, prefix + T.pickDate(data.doctorName!, dates, ctx.deps.today()));
  }
  const pageCount = Math.ceil(slots.length / SLOT_PAGE_SIZE);
  const p = page >= pageCount ? 0 : page;
  const shown = slots.slice(p * SLOT_PAGE_SIZE, (p + 1) * SLOT_PAGE_SIZE);
  return ask(
    ctx,
    "TIME",
    { ...data, slots, slotPage: p },
    prefix + T.pickTime(data.date!, ctx.deps.today(), shown, pageCount <= 1 ? null : p < pageCount - 1 ? "next" : "first")
  );
}

async function onPickDate(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = numericChoice(text);
  const date = n !== null ? state.data.dates?.[n - 1] : undefined;
  if (!date) return invalid(ctx, state);
  return showSlots(ctx, { ...state.data, date }, 0);
}

async function onPickTime(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = numericChoice(text);
  const d = state.data;
  const slots = d.slots ?? [];
  const page = d.slotPage ?? 0;
  const pageCount = Math.ceil(slots.length / SLOT_PAGE_SIZE);

  if (n === 9 && pageCount > 1) return showSlots(ctx, d, page + 1);

  const shown = slots.slice(page * SLOT_PAGE_SIZE, (page + 1) * SLOT_PAGE_SIZE);
  const time = n !== null && n >= 1 ? shown[n - 1] : undefined;
  if (!time) return invalid(ctx, state);

  return ask(
    ctx,
    "CONFIRM",
    { ...d, time },
    T.confirmBooking({
      patient: d.patientName ?? "You",
      doctor: d.doctorName!,
      date: d.date!,
      time,
      today: ctx.deps.today(),
      resched: d.flow === "resched",
    })
  );
}

async function onConfirm(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = confirmChoice(text);
  const d = state.data;
  if (n === 2) return showSlots(ctx, d, 0);
  if (n !== 1) return invalid(ctx, state);

  const today = ctx.deps.today();
  const slot = { date: d.date!, time: d.time! };

  if (d.flow === "resched" && d.appt) {
    const r = await ctx.deps.reschedule({ patientId: d.patientId!, appointmentId: d.appt.id, ...slot });
    if (r.ok) return endFlow(ctx, T.rescheduled({ doctor: d.doctorName!, ...slot, today }));
    if (r.reason === "SLOT_TAKEN") return showSlots(ctx, d, 0, T.slotTaken);
    return endFlow(ctx, T.failed(null));
  }

  const r = await ctx.deps.book({
    patientId: d.patientId ?? null,
    patientName: d.patientName ?? "Patient",
    doctorId: d.doctorId!,
    ...slot,
  });
  if (r.ok) return endFlow(ctx, T.booked({ doctor: d.doctorName!, ...slot, today, token: r.token }));
  if (r.reason === "SLOT_TAKEN") return showSlots(ctx, d, 0, T.slotTaken);
  return endFlow(ctx, T.failed(null));
}

// ── Manage existing appointments ────────────────────────────────────────────

async function onManagePick(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = numericChoice(text);
  const appt = n !== null ? state.data.appts?.[n - 1] : undefined;
  if (!appt) return invalid(ctx, state);
  return ask(ctx, "MANAGE_ACTION", { ...state.data, appt }, T.manageAction(appt, ctx.deps.today()));
}

async function onManageAction(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = numericChoice(text);
  const appt = state.data.appt as ApptRef | undefined;
  if (!appt) return showMenu(ctx);

  if (n === 1) {
    const dates = await ctx.deps.availableDates(appt.doctorId);
    if (dates.length === 0) return endFlow(ctx, T.noDates(appt.doctorName, false));
    const data: FlowData = { ...state.data, flow: "resched", doctorId: appt.doctorId, doctorName: appt.doctorName, dates };
    return ask(ctx, "DATE", data, T.pickDate(appt.doctorName, dates, ctx.deps.today()));
  }
  if (n === 2) return ask(ctx, "CANCEL_CONFIRM", state.data, T.confirmCancel(appt, ctx.deps.today()));
  return invalid(ctx, state);
}

async function onCancelConfirm(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = confirmChoice(text);
  const appt = state.data.appt as ApptRef | undefined;
  if (!appt) return showMenu(ctx);
  if (n === 2) return endFlow(ctx, T.keptAppointment);
  if (n !== 1) return invalid(ctx, state);

  const r = await ctx.deps.cancel({ patientId: state.data.patientId!, appointmentId: appt.id });
  if (r.ok) return endFlow(ctx, T.cancelled(appt));
  return endFlow(ctx, T.failed(null));
}

// ── Reports & prescriptions ─────────────────────────────────────────────────

async function onReportsPick(ctx: Ctx, state: MenuState, text: string): Promise<MenuOutcome> {
  const n = numericChoice(text);
  const doc = n !== null ? state.data.files?.[n - 1] : undefined;
  if (!doc) return invalid(ctx, state);

  const r = await ctx.deps.openDocument(state.data.patientId!, doc);
  let reply: string;
  if (r.kind === "text") reply = r.text + T.documentHint;
  else if (r.kind === "file_sent") reply = T.sendingFile(doc.label) + T.documentHint;
  else if (r.reason === "too_large") reply = T.fileTooLarge + T.documentHint;
  else reply = T.fileMissing + T.documentHint;

  // Keep the list open so the patient can fetch another one.
  return {
    replies: [reply],
    state: { ...state, data: { ...state.data, lastPrompt: T.pickDocument(state.data.files ?? []) }, updatedAt: ctx.deps.now() },
  };
}

