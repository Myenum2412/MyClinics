import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Prescriptions — My Clinics Docs",
  description: "Create and share prescriptions digitally.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Prescriptions</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Create and share prescriptions digitally.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Write medicines, dosage, and duration. Example: 'Azithromycin 500mg — 1 daily for 3 days' — patient gets it on phone, pharmacy can dispense. Purpose: clear, legible prescriptions.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> 'Azithromycin 500mg — 1 daily for 3 days' — patient gets it on phone, pharmacy can dispense. Purpose: clear, legible prescriptions.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Prescriptions — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
