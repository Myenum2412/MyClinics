import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Treatment — My Clinics Docs",
  description: "Track complaints, diagnosis, and treatment plans.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Treatment</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Track complaints, diagnosis, and treatment plans.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Record why the patient came (complaint), what was found, and the plan. Example: 'Fever 3 days' → diagnosis → prescription. Purpose: keep the care story together.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> 'Fever 3 days' → diagnosis → prescription. Purpose: keep the care story together.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Treatment — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
