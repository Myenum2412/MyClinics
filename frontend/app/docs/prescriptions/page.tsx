import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Prescriptions — My Clinics Docs",
  description: "Write clear, shareable digital prescriptions.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Prescriptions</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Write clear, shareable digital prescriptions.</p>
      <div className="mt-8">
        <h2 className="text-lg font-semibold">How to create / use Prescriptions</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
          <li>Open Prescriptions → New → select patient and doctor.</li><li>Add medicines: name, dosage (e.g., '1-0-1'), duration and instructions — e.g., 'Azithromycin 500mg — 1 daily for 3 days'.</li><li>Save & Share — patient gets it on phone, pharmacy can dispense directly — no handwriting confusion.</li>
        </ol>
      </div>
      <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-semibold">How it works:</span> Everything is saved to your clinic workspace instantly. You see only your clinic data, and each role (patient, doctor, admin) sees only what they are allowed to — like separate locked drawers.
      </div>
      <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
        <span className="font-semibold">Tip:</span> Open this from the app sidebar → Prescriptions. If you do not see it, your role may not have access — ask your clinic admin.
      </div>
    </div>
  );
}
