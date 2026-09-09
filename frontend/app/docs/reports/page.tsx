import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Reports — My Clinics Docs",
  description: "Insights on revenue, appointments, and performance.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Reports</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Insights on revenue, appointments, and performance.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Charts for revenue, patient flow, and doctor workload. Example: see this week's appointments vs last week. Purpose: decide staffing and pricing.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> see this week's appointments vs last week. Purpose: decide staffing and pricing.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Reports — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
