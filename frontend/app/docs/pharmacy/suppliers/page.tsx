import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Suppliers — My Clinics Docs",
  description: "Manage medicine suppliers.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Suppliers</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Manage medicine suppliers.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Add supplier contacts and link purchases. Example: 'City Pharma — 98765...'. Purpose: quick reorders.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> 'City Pharma — 98765...'. Purpose: quick reorders.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Suppliers — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
