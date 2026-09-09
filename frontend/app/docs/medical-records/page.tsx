import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Medical Records — My Clinics Docs",
  description: "Store and share medical files securely.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Medical Records</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Store and share medical files securely.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Upload scans, reports, and notes. Example: upload a lab PDF — the patient sees it in their portal instantly. Purpose: no lost reports.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> upload a lab PDF — the patient sees it in their portal instantly. Purpose: no lost reports.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Medical Records — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
