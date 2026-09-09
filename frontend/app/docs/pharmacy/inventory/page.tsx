import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pharmacy Inventory — My Clinics Docs",
  description: "Track medicine stock in real time.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Pharmacy — Inventory</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Track medicine stock in real time.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">See what is in stock, low stock, and expiry. Example: Paracetamol 100 strips left — reorder alert at 20. Purpose: never run out.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> Paracetamol 100 strips left — reorder alert at 20. Purpose: never run out.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — Pharmacy — Inventory — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
