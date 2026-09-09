import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Treatment — My Clinics Docs",
  description: "Record complaints, diagnosis, and care plans in one flow.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Treatment</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Record complaints, diagnosis, and care plans in one flow.</p>
      <div className="mt-8">
        <h2 className="text-lg font-semibold">How to create / use Treatment</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
          <li>Open Treatment → select patient → enter Chief Complaint (e.g., 'Fever 3 days').</li><li>Add Diagnosis, vitals, and Treatment Plan — then link a Prescription if needed.</li><li>Save — the care story stays tied to that visit for future reference.</li>
        </ol>
      </div>
      <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-semibold">How it works:</span> Everything is saved to your clinic workspace instantly. You see only your clinic data, and each role (patient, doctor, admin) sees only what they are allowed to — like separate locked drawers.
      </div>
      <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
        <span className="font-semibold">Tip:</span> Open this from the app sidebar → Treatment. If you do not see it, your role may not have access — ask your clinic admin.
      </div>
    </div>
  );
}
