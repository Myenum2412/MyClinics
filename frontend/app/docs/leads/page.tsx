import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Leads — My Clinics Docs",
  description: "Track enquiries and follow up.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Leads</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Track enquiries and follow up.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Capture people who asked but did not book. Example: website enquiry → follow up on WhatsApp → convert to appointment. Purpose: grow patient base.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> website enquiry → follow up on WhatsApp → convert to appointment. Purpose: grow patient base.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Leads — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
