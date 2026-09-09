import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Appointments — My Clinics Docs",
  description: "How appointments work — booking, queue tokens, rescheduling, and reminders.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Appointments</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">How appointments work — booking, queue tokens, rescheduling, and reminders.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">The calendar where patients pick a doctor, date and time. Example: a patient books Dr. Sharma for 10 AM — the clinic sees it instantly, a token number is assigned, and a WhatsApp reminder is sent before the visit. Purpose: remove phone back-and-forth.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> a patient books Dr. Sharma for 10 AM — the clinic sees it instantly, a token number is assigned, and a WhatsApp reminder is sent before the visit. Purpose: remove phone back-and-forth.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Appointments — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
