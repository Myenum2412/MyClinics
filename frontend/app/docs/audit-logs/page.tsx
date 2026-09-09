import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Audit Logs — My Clinics Docs",
  description: "See who did what and when.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Audit Logs</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">See who did what and when.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Every change logged — who created, edited, or billed. Example: 'Admin edited patient record at 3:02 PM'. Purpose: trust and accountability.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> 'Admin edited patient record at 3:02 PM'. Purpose: trust and accountability.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Audit Logs — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
