import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Audit Logs — My Clinics Docs",
  description: "Every change tracked — who did what, when.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Audit Logs</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Every change tracked — who did what, when.</p>
      <div className="mt-8">
        <h2 className="text-lg font-semibold">How to create / use Audit Logs</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
          <li>Open Audit Logs (admin only) → filter by user, action, or date.</li><li>See entries like 'Admin edited patient record at 3:02 PM' or 'Staff created bill #102'.</li><li>Use for accountability and troubleshooting — nothing is hidden.</li>
        </ol>
      </div>
      <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-semibold">How it works:</span> Everything is saved to your clinic workspace instantly. You see only your clinic data, and each role (patient, doctor, admin) sees only what they are allowed to — like separate locked drawers.
      </div>
      <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
        <span className="font-semibold">Tip:</span> Open this from the app sidebar → Audit Logs. If you do not see it, your role may not have access — ask your clinic admin.
      </div>
    </div>
  );
}
