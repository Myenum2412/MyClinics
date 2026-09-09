import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AI Assistant — My Clinics Docs",
  description: "24/7 WhatsApp assistant that books for you.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">AI Assistant</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">24/7 WhatsApp assistant that books for you.</p>
      <div className="mt-6 rounded-lg border bg-muted/30 p-5">
        <p className="text-sm font-semibold">Purpose</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Patients message on WhatsApp — the assistant checks availability and books. Example: 'Need appointment tomorrow morning' → suggests slots → confirms. Purpose: front desk that never sleeps.</p>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Example</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground"> 'Need appointment tomorrow morning' → suggests slots → confirms. Purpose: front desk that never sleeps.</p>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">How it works: open this page from the app sidebar — AI Assistant — and you will see the data for your clinic only. Everything is saved instantly and appears for the right role (patient, doctor, admin).</p>
    </div>
  );
}
