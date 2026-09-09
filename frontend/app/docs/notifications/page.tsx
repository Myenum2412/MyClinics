import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Notifications — My Clinics Docs",
  description: "Stay updated with alerts and reminders.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Notifications</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Stay updated with alerts and reminders.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">System alerts for bookings, cancellations, and WhatsApp status. Example: 'New appointment — Riya at 10 AM'. Purpose: never miss a change.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> 'New appointment — Riya at 10 AM'. Purpose: never miss a change.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Notifications — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
