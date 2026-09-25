/** All patient-facing wording and formatting lives here so it is easy to review and localize. */
const DIGITS = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
export const num = (i: number): string => (i >= 0 && i <= 9 ? DIGITS[i] : `${i}.`);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "Sat 26 Sep" */
export function fmtDate(iso: string): string {
  const d = utc(iso);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Today, Fri 25 Sep" / "Tomorrow, Sat 26 Sep" / "Sun 27 Sep" */
export function fmtDay(iso: string, today: string): string {
  const diff = Math.round((utc(iso).getTime() - utc(today).getTime()) / 86_400_000);
  if (diff === 0) return `Today, ${fmtDate(iso)}`;
  if (diff === 1) return `Tomorrow, ${fmtDate(iso)}`;
  return fmtDate(iso);
}

/** "10:30 AM" */
export function fmtTime(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const drName = (name: string): string => (/^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`);

export const BACK_LINE = `${num(0)} Main menu`;
const numbered = (items: string[]): string => items.map((t, i) => `${num(i + 1)} ${t}`).join("\n");

export const T = {
  menu: (clinic: string, name: string | null) =>
    [
      `Hello ${name ?? "there"}! 👋 Welcome to ${clinic}.`,
      "How can I help you today? Reply with a number:",
      "",
      numbered([
        "Book an appointment",
        "Reschedule / cancel appointment",
        "My upcoming appointments",
        "Clinic timings & location",
        "My reports & prescriptions",
        "Talk to our staff",
      ]),
    ].join("\n"),

  didntUnderstand: "Sorry, I didn't understand that. 🙏\n\n",
  textOnly: "I can only read text messages right now. 🙏\n\n",
  invalid: "Sorry, I didn't get that. Please reply with one of the numbers below.\n\n",

  pickPatient: (patients: { name: string }[]) =>
    `Who is this for? Reply with a number:\n\n${numbered(patients.map((p) => p.name))}\n\n${BACK_LINE}`,

  noRecords: `I couldn't find any records for this number yet.\n\n${numbered(["Book my first appointment"])}\n${BACK_LINE}`,

  noDoctors: (phone: string | null) =>
    `Online booking isn't available right now.${phone ? ` Please call us at ${phone}.` : " Please contact the clinic directly."}\n\n${BACK_LINE}`,

  pickDoctor: (doctors: { name: string; specialization: string | null }[]) =>
    `Who would you like to see? Reply with a number:\n\n${numbered(
      doctors.map((d) => `${drName(d.name)}${d.specialization ? ` (${d.specialization})` : ""}`)
    )}\n\n${BACK_LINE}`,

  noDates: (doctor: string, canPickAnother: boolean) =>
    `Sorry, ${drName(doctor)} has no free slots in the next 7 days. 😔\n\n${
      canPickAnother ? "Reply with another doctor's number, or " : "Reply "
    }${num(0)} for the main menu.`,

  pickDate: (doctor: string, dates: string[], today: string) =>
    `📅 Which day for ${drName(doctor)}? Reply with a number:\n\n${numbered(dates.map((d) => fmtDay(d, today)))}\n\n${BACK_LINE}`,

  /** `more`: "next" = further pages exist, "first" = this is the last page (9 goes back to the earliest times). */
  pickTime: (date: string, today: string, slots: string[], more: "next" | "first" | null) =>
    `🕒 Available times on ${fmtDay(date, today)}:\n\n${numbered(slots.map(fmtTime))}${
      more === "next" ? `\n${num(9)} More times ➡️` : more === "first" ? `\n${num(9)} Earlier times ⬅️` : ""
    }\n\n${BACK_LINE}`,

  slotTaken: "Sorry, that time was just taken by someone else. 😔 Here are the latest times:\n\n",

  confirmBooking: (p: { patient: string; doctor: string; date: string; time: string; today: string; resched: boolean }) =>
    [
      p.resched ? "Please confirm the new time:" : "Please confirm your appointment:",
      "",
      `👤 ${p.patient}`,
      `👨‍⚕️ ${drName(p.doctor)}`,
      `📅 ${fmtDay(p.date, p.today)}`,
      `🕙 ${fmtTime(p.time)}`,
      "",
      numbered(["Confirm", "Choose another time"]),
      BACK_LINE,
    ].join("\n"),

  booked: (p: { doctor: string; date: string; time: string; today: string; token: number | null }) =>
    [
      "✅ Your appointment is booked!",
      "",
      `👨‍⚕️ ${drName(p.doctor)}`,
      `📅 ${fmtDay(p.date, p.today)}`,
      `🕙 ${fmtTime(p.time)}`,
      ...(p.token ? [`🎫 Token #${p.token}`] : []),
      "",
      "Please arrive 10 minutes early. We'll send you a reminder before your visit.",
      "",
      BACK_LINE,
    ].join("\n"),

  rescheduled: (p: { doctor: string; date: string; time: string; today: string }) =>
    `✅ Done! Your appointment is now on ${fmtDay(p.date, p.today)} at ${fmtTime(p.time)} with ${drName(p.doctor)}.\n\n${BACK_LINE}`,

  cancelled: (a: { date: string; time: string }) =>
    `Your appointment on ${fmtDate(a.date)} at ${fmtTime(a.time)} has been cancelled. ✅\n\n${numbered(["Book a new appointment"])}\n${BACK_LINE}`,

  keptAppointment: `No problem, your appointment is unchanged. 👍\n\n${BACK_LINE}`,

  failed: (phone: string | null) =>
    `Sorry, I couldn't complete that right now. Please try again in a moment${phone ? ` or call us at ${phone}` : ""}.\n\n${BACK_LINE}`,

  upcoming: (appts: { doctorName: string; date: string; time: string }[], today: string) =>
    appts.length === 0
      ? `You have no upcoming appointments.\n\n${numbered(["Book an appointment"])}\n${BACK_LINE}`
      : [
          "📋 Your upcoming appointments:",
          "",
          ...appts.map((a) => `• ${fmtDay(a.date, today)}, ${fmtTime(a.time)} – ${drName(a.doctorName)}`),
          "",
          `${num(1)} Book another appointment`,
          `${num(2)} Reschedule / cancel`,
          BACK_LINE,
        ].join("\n"),

  pickAppointment: (appts: { doctorName: string; date: string; time: string }[], today: string) =>
    `Which appointment? Reply with a number:\n\n${appts
      .map((a, i) => `${num(i + 1)} ${fmtDay(a.date, today)}, ${fmtTime(a.time)} – ${drName(a.doctorName)}`)
      .join("\n")}\n\n${BACK_LINE}`,

  noUpcoming: `You have no upcoming appointments to change.\n\n${numbered(["Book an appointment"])}\n${BACK_LINE}`,

  manageAction: (a: { doctorName: string; date: string; time: string }, today: string) =>
    `${fmtDay(a.date, today)}, ${fmtTime(a.time)} with ${drName(a.doctorName)}\n\nWhat would you like to do?\n\n${numbered([
      "Reschedule",
      "Cancel appointment",
    ])}\n${BACK_LINE}`,

  confirmCancel: (a: { doctorName: string; date: string; time: string }, today: string) =>
    `Cancel your appointment on ${fmtDay(a.date, today)} at ${fmtTime(a.time)} with ${drName(a.doctorName)}?\n\n${numbered([
      "Yes, cancel it",
      "No, keep it",
    ])}`,

  noDocuments: `You don't have any reports or prescriptions with us yet.\n\n${BACK_LINE}`,

  pickDocument: (docs: { kind: "file" | "rx"; label: string }[]) =>
    `Which one would you like? Reply with a number:\n\n${docs
      .map((d, i) => `${num(i + 1)} ${d.kind === "rx" ? "💊" : "📄"} ${d.label}`)
      .join("\n")}\n\n${BACK_LINE}`,

  documentHint: `\n\nReply another number for more, or ${num(0)} for the main menu.`,
  sendingFile: (label: string) => `📎 Sending "${label}" now…`,
  fileTooLarge: "That file is too large to send here. Please collect it at the clinic or view it in the patient portal.",
  fileMissing: "Sorry, I couldn't find that file any more. Please contact the clinic.",

  staffNotified: (name: string | null) =>
    `Thank you${name ? `, ${name}` : ""}! ✅ Our team has been notified and will reply here shortly.\n\nSend ${num(0)} at any time to return to the menu.`,
} as const;
