import { beforeEach, describe, expect, it, vi } from "vitest";
import { HANDOFF_MS, IDLE_MS, handleMenuMessage } from "@/services/whatsapp/menu/engine";
import type { ApptRef, DocRef, DoctorRef, InboundText, MenuDeps, MenuState, PatientRef } from "@/services/whatsapp/menu/types";

const DOCTORS: DoctorRef[] = [
  { id: "doc_1", name: "Kumar", specialization: "Dentist" },
  { id: "doc_2", name: "Dr. Priya", specialization: null },
];
const ASTHA: PatientRef = { id: "pat_1", name: "Asha" };
const APPT: ApptRef = { id: "apt_1", doctorId: "doc_1", doctorName: "Kumar", date: "2026-09-26", time: "10:30" };

let clock = 1_000_000;

function makeDeps(over: Partial<MenuDeps> = {}): MenuDeps & { calls: Record<string, unknown[]> } {
  const calls: Record<string, unknown[]> = {};
  const rec = <T>(name: string, value: T) => {
    (calls[name] ??= []).push(value);
  };
  const deps: MenuDeps = {
    clinicName: "Smile Dental",
    now: () => clock,
    today: () => "2026-09-25",
    findPatients: async () => [ASTHA],
    listDoctors: async () => DOCTORS,
    availableDates: async () => ["2026-09-25", "2026-09-26", "2026-09-28"],
    freeSlots: async () => ["09:00", "09:30", "10:00", "10:30"],
    book: async (a) => (rec("book", a), { ok: true, token: 4 }),
    listUpcoming: async () => [APPT],
    reschedule: async (a) => (rec("reschedule", a), { ok: true }),
    cancel: async (a) => (rec("cancel", a), { ok: true }),
    clinicInfo: async () => "🏥 Smile Dental\n📍 12 Main Road\n📞 044 1234",
    listDocuments: async () => [
      { id: "f:1", kind: "file", label: "Lab report.pdf" },
      { id: "p:1", kind: "rx", label: "Prescription – 20 Sep" },
    ],
    openDocument: async (pid, doc) => (rec("open", [pid, doc.id]), doc.kind === "rx" ? { kind: "text", text: "💊 Amoxicillin 500mg" } : { kind: "file_sent" }),
    requestStaff: async (a) => void rec("staff", a),
    ...over,
  };
  return Object.assign(deps, { calls });
}

/** Sends a sequence of messages through the engine, carrying state, and returns the last outcome plus all replies. */
async function chat(deps: MenuDeps, messages: (string | Partial<InboundText>)[], start: MenuState | null = null, pushName: string | null = "Asha") {
  let state = start;
  let last: Awaited<ReturnType<typeof handleMenuMessage>> = { replies: [], state };
  const all: string[][] = [];
  for (const m of messages) {
    const input: InboundText = typeof m === "string" ? { text: m, type: "text", pushName } : { text: "", type: "text", pushName, ...m };
    clock += 1000;
    last = await handleMenuMessage(input, state, deps);
    state = last.state;
    all.push(last.replies);
  }
  return { ...last, all, text: last.replies.join("\n") };
}

beforeEach(() => {
  clock = 1_000_000;
});

describe("greeting and routing", () => {
  it("replies to a greeting with the numbered menu, personalised", async () => {
    const r = await chat(makeDeps(), ["Hi"]);
    expect(r.text).toContain("Hello Asha! 👋 Welcome to Smile Dental");
    for (const line of ["Book an appointment", "Reschedule / cancel", "My upcoming appointments", "Clinic timings & location", "My reports & prescriptions", "Talk to our staff"]) {
      expect(r.text).toContain(line);
    }
    expect(r.state?.step).toBe("MENU");
  });

  it("works without a profile name and for common greetings", async () => {
    for (const g of ["hello", "Hii", "good morning", "menu", "0", "Vanakkam", "hi there!"]) {
      const r = await chat(makeDeps(), [g], null, null);
      expect(r.text).toContain("Hello there!");
    }
  });

  it("uses keywords from free text when there is no active conversation", async () => {
    const book = await chat(makeDeps(), ["I want to book an appointment"]);
    expect(book.state?.step).toBe("DOCTOR");
    const cancel = await chat(makeDeps(), ["please cancel my appointment"]);
    expect(cancel.state?.step).toBe("MANAGE_PICK");
    const mine = await chat(makeDeps(), ["my appointments"]);
    expect(mine.text).toContain("Your upcoming appointments");
    const info = await chat(makeDeps(), ["what are your timings"]);
    expect(info.text).toContain("12 Main Road");
    const reports = await chat(makeDeps(), ["need my lab report"]);
    expect(reports.state?.step).toBe("REPORTS_PICK");
  });

  it("shows the menu again for messages it does not understand", async () => {
    const r = await chat(makeDeps(), ["asdf qwerty"]);
    expect(r.text).toContain("Sorry, I didn't understand");
    expect(r.text).toContain("Book an appointment");
  });

  it("tells patients it can only read text for voice/images and shows the menu", async () => {
    const r = await chat(makeDeps(), [{ type: "audio", text: "" }]);
    expect(r.text).toContain("only read text");
    expect(r.text).toContain("Book an appointment");
  });

  it("'0' returns to the menu from inside any flow", async () => {
    const r = await chat(makeDeps(), ["hi", "1", "0"]);
    expect(r.state?.step).toBe("MENU");
    expect(r.text).toContain("Welcome to Smile Dental");
  });
});

describe("booking", () => {
  it("books end to end: doctor → day → time → confirm", async () => {
    const deps = makeDeps();
    const r = await chat(deps, ["hi", "1", "1", "2", "3", "1"]);
    expect(deps.calls.book).toEqual([{ patientId: "pat_1", patientName: "Asha", doctorId: "doc_1", date: "2026-09-26", time: "10:00" }]);
    expect(r.text).toContain("Your appointment is booked");
    expect(r.text).toContain("Dr. Kumar"); // "Kumar" gets a Dr. prefix, "Dr. Priya" is not doubled
    expect(r.text).toContain("Sat 26 Sep");
    expect(r.text).toContain("10:00 AM");
    expect(r.text).toContain("Token #4");
    expect(r.state?.step).toBe("MENU");
  });

  it("does not double the 'Dr.' prefix", async () => {
    const r = await chat(makeDeps(), ["hi", "1"]);
    expect(r.text).toContain("Dr. Kumar (Dentist)");
    expect(r.text).toContain("Dr. Priya");
    expect(r.text).not.toContain("Dr. Dr.");
  });

  it("skips doctor selection when the clinic has one doctor", async () => {
    const r = await chat(makeDeps({ listDoctors: async () => [DOCTORS[0]] }), ["hi", "1"]);
    expect(r.state?.step).toBe("DATE");
    expect(r.text).toContain("Today, Fri 25 Sep");
    expect(r.text).toContain("Tomorrow, Sat 26 Sep");
  });

  it("registers an unknown number at confirmation time (patientId null, WhatsApp name)", async () => {
    const deps = makeDeps({ findPatients: async () => [] });
    await chat(deps, ["hi", "1", "1", "1", "1", "1"], null, "Ravi");
    expect(deps.calls.book).toEqual([{ patientId: null, patientName: "Ravi", doctorId: "doc_1", date: "2026-09-25", time: "09:00" }]);
  });

  it("asks who the booking is for when several profiles share the number", async () => {
    const deps = makeDeps({ findPatients: async () => [ASTHA, { id: "pat_2", name: "Arun" }] });
    const pick = await chat(deps, ["hi", "1"]);
    expect(pick.state?.step).toBe("PICK_PATIENT");
    expect(pick.text).toContain("Who is this for?");
    await chat(deps, ["hi", "1", "2", "1", "1", "1", "1"]);
    expect((deps.calls.book![0] as { patientId: string }).patientId).toBe("pat_2");
  });

  it("re-shows fresh times when the slot was taken meanwhile", async () => {
    const deps = makeDeps({ book: async () => ({ ok: false, reason: "SLOT_TAKEN" }) });
    const r = await chat(deps, ["hi", "1", "1", "2", "1", "1"]);
    expect(r.text).toContain("just taken");
    expect(r.state?.step).toBe("TIME");
  });

  it("lets the patient choose another time at the confirmation step", async () => {
    const r = await chat(makeDeps(), ["hi", "1", "1", "2", "1", "2"]);
    expect(r.state?.step).toBe("TIME");
  });

  it("accepts yes/ok at confirmation", async () => {
    const deps = makeDeps();
    await chat(deps, ["hi", "1", "1", "2", "1", "yes"]);
    expect(deps.calls.book).toHaveLength(1);
  });

  it("pages through more than 8 slots with option 9", async () => {
    const slots = Array.from({ length: 12 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
    const deps = makeDeps({ freeSlots: async () => slots });
    const first = await chat(deps, ["hi", "1", "1", "1"]);
    expect(first.text).toContain("More times");
    expect(first.text).toContain("9:00 AM");
    const second = await chat(deps, ["hi", "1", "1", "1", "9"]);
    expect(second.text).toContain("1:00 PM"); // slot index 8
    expect(second.text).not.toContain("More times");
    expect(second.text).toContain("Earlier times"); // last page offers a way back
    const wrapped = await chat(deps, ["hi", "1", "1", "1", "9", "9"]);
    expect(wrapped.text).toContain("9:00 AM");
    expect(wrapped.text).toContain("More times");
    await chat(deps, ["hi", "1", "1", "1", "9", "1", "1"]);
    expect((deps.calls.book![0] as { time: string }).time).toBe(slots[8]);
  });

  it("explains when a doctor has no free days", async () => {
    const r = await chat(makeDeps({ availableDates: async () => [] }), ["hi", "1", "1"]);
    expect(r.text).toContain("no free slots");
    expect(r.state?.step).toBe("DOCTOR"); // can pick another doctor
  });

  it("handles a clinic without doctors", async () => {
    const r = await chat(makeDeps({ listDoctors: async () => [] }), ["hi", "1"]);
    expect(r.text).toContain("Online booking isn't available");
  });

  it("re-asks the question on invalid input instead of guessing", async () => {
    for (const bad of ["banana", "9", "0.5", "99"]) {
      const r = await chat(makeDeps(), ["hi", "1", bad]);
      expect(r.text).toContain("Please reply with one of the numbers");
      expect(r.text).toContain("Who would you like to see?");
      expect(r.state?.step).toBe("DOCTOR");
    }
  });
});

describe("conversation state", () => {
  it("expires an idle conversation: a bare '1' after 30 minutes no longer books", async () => {
    const deps = makeDeps();
    const mid = await chat(deps, ["hi", "1", "1"]);
    clock += IDLE_MS + 1;
    const r = await chat(deps, ["1"], mid.state);
    expect(r.text).toContain("Sorry, I didn't understand");
    expect(r.state?.step).toBe("MENU");
    expect(deps.calls.book).toBeUndefined();
  });

  it("numbers only act as menu shortcuts right after the menu (state MENU)", async () => {
    const r = await chat(makeDeps(), ["3"]); // no state
    expect(r.text).toContain("Sorry, I didn't understand");
  });
});

describe("manage appointments", () => {
  it("reschedules: pick appointment → reschedule → day → time → confirm", async () => {
    const deps = makeDeps();
    const r = await chat(deps, ["hi", "2", "1", "1", "2", "2", "1"]);
    expect(deps.calls.reschedule).toEqual([{ patientId: "pat_1", appointmentId: "apt_1", date: "2026-09-26", time: "09:30" }]);
    expect(r.text).toContain("Your appointment is now on Tomorrow, Sat 26 Sep at 9:30 AM");
    expect(deps.calls.book).toBeUndefined();
  });

  it("cancels only after an explicit yes", async () => {
    const deps = makeDeps();
    const r = await chat(deps, ["hi", "2", "1", "2", "1"]);
    expect(deps.calls.cancel).toEqual([{ patientId: "pat_1", appointmentId: "apt_1" }]);
    expect(r.text).toContain("has been cancelled");
  });

  it("keeps the appointment when the patient says no", async () => {
    const deps = makeDeps();
    const r = await chat(deps, ["hi", "2", "1", "2", "2"]);
    expect(deps.calls.cancel).toBeUndefined();
    expect(r.text).toContain("unchanged");
  });

  it("reports when there is nothing to change", async () => {
    const r = await chat(makeDeps({ listUpcoming: async () => [] }), ["hi", "2"]);
    expect(r.text).toContain("no upcoming appointments to change");
  });

  it("shows upcoming appointments as a list", async () => {
    const r = await chat(makeDeps(), ["hi", "3"]);
    expect(r.text).toContain("• Tomorrow, Sat 26 Sep, 10:30 AM – Dr. Kumar");
  });

  it("says so when the number has no patient record", async () => {
    const r = await chat(makeDeps({ findPatients: async () => [] }), ["hi", "3"]);
    expect(r.text).toContain("couldn't find any records");
  });
});

describe("clinic info, reports and staff", () => {
  it("shows clinic info and lets the patient go straight to booking", async () => {
    const r = await chat(makeDeps(), ["hi", "4"]);
    expect(r.text).toContain("📍 12 Main Road");
    const booked = await chat(makeDeps(), ["hi", "4", "1"]);
    expect(booked.state?.step).toBe("DOCTOR");
  });

  it("falls back gracefully when the clinic has no info configured", async () => {
    const r = await chat(makeDeps({ clinicInfo: async () => null }), ["hi", "4"]);
    expect(r.text).toContain("contact the clinic directly");
  });

  it("sends a report file and a prescription summary, keeping the list open", async () => {
    const deps = makeDeps();
    const file = await chat(deps, ["hi", "5", "1"]);
    expect(file.text).toContain('Sending "Lab report.pdf"');
    expect(file.state?.step).toBe("REPORTS_PICK");
    const rx = await chat(deps, ["hi", "5", "1", "2"]);
    expect(rx.text).toContain("Amoxicillin 500mg");
    expect(deps.calls.open).toEqual([["pat_1", "f:1"], ["pat_1", "f:1"], ["pat_1", "p:1"]]);
  });

  it("explains oversized or missing files", async () => {
    const big = await chat(makeDeps({ openDocument: async () => ({ kind: "error", reason: "too_large" }) }), ["hi", "5", "1"]);
    expect(big.text).toContain("too large");
    const gone = await chat(makeDeps({ openDocument: async () => ({ kind: "error", reason: "missing" }) }), ["hi", "5", "1"]);
    expect(gone.text).toContain("couldn't find that file");
  });

  it("has a friendly message with no documents", async () => {
    const r = await chat(makeDeps({ listDocuments: async () => [] }), ["hi", "5"]);
    expect(r.text).toContain("don't have any reports");
  });

  it("hands over to staff, then stays silent until resumed or expired", async () => {
    const deps = makeDeps();
    const handoff = await chat(deps, ["hi", "6"]);
    expect(deps.calls.staff).toEqual([{ patientName: "Asha" }]);
    expect(handoff.text).toContain("team has been notified");
    expect(handoff.state?.step).toBe("HANDOFF");

    const silent = await chat(deps, ["when will someone call?", "thanks"], handoff.state);
    expect(silent.all).toEqual([[], []]);

    const resumed = await chat(deps, ["0"], handoff.state);
    expect(resumed.text).toContain("Welcome to Smile Dental");

    clock += HANDOFF_MS + 1;
    const expired = await chat(deps, ["hello?"], handoff.state);
    expect(expired.text).toContain("Sorry, I didn't understand");
    expect(expired.state?.step).toBe("MENU");
  });
});

describe("robustness", () => {
  it("propagates dependency failures so the caller can reply with a safe message", async () => {
    const deps = makeDeps({ listDoctors: vi.fn().mockRejectedValue(new Error("db down")) });
    await expect(chat(deps, ["hi", "1"])).rejects.toThrow("db down");
  });
});
