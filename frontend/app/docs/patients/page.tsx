import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Patients — My Clinics Docs",
  description: "Your patient directory — search, view history, and manage profiles.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Patients</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Your patient directory — search, view history, and manage profiles.</p>
      <div className="mt-8">
        <h2 className="text-lg font-semibold">How to create / use Patients</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
          <li>Go to Patients → click Add Patient or search an existing name/phone.</li><li>Open a patient card to see past visits, prescriptions, medical files, and bills.</li><li>Edit details or add a new visit from the patient page — staff can check history without digging through paper.</li>
        </ol>
      </div>
      <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-semibold">How it works:</span> Everything is saved to your clinic workspace instantly. You see only your clinic data, and each role (patient, doctor, admin) sees only what they are allowed to — like separate locked drawers.
      </div>
      <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
        <span className="font-semibold">Tip:</span> Open this from the app sidebar → Patients. If you do not see it, your role may not have access — ask your clinic admin.
      </div>
    </div>
  );
}
