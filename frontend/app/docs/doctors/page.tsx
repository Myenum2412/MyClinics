import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Doctors — My Clinics Docs",
  description: "Manage doctors, schedules, and departments.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Doctors</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Manage doctors, schedules, and departments.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Add doctors, their speciality, and working hours. Example: add Dr. Patel — Cardiology — Mon-Sat 10-2. Purpose: patients book the right doctor at the right time.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> add Dr. Patel — Cardiology — Mon-Sat 10-2. Purpose: patients book the right doctor at the right time.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Doctors — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
