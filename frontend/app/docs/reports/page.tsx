import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Reports — My Clinics Docs",
  description: "Revenue, appointments, and performance insights.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Reports</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Revenue, appointments, and performance insights.</p>
      <div className="mt-8">
        <h2 className="text-lg font-semibold">How to create / use Reports</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
          <li>Open Reports → choose date range and report type (Revenue, Appointments, Doctor workload).</li><li>View charts — e.g., this week's appointments vs last week.</li><li>Export or use insights to decide staffing and pricing.</li>
        </ol>
      </div>
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Detailed Example</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Follow the steps above with real data. For instance, if you create a new entry, fill all required fields, double-check the details, then save. You will see a success message and the new item appears in the list immediately. Try editing it — the change is logged and visible to your team right away. If something looks wrong, use the history or audit trail to review what changed and when.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tip: use the search and filters at the top of the list to find your new entry quickly. Everything you create is scoped to your clinic — other clinics never see it.</p>
      </div>
      <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-semibold">How it works:</span> Everything is saved to your clinic workspace instantly. You see only your clinic data, and each role (patient, doctor, admin) sees only what they are allowed to — like separate locked drawers.
      </div>
      <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
        <span className="font-semibold">Tip:</span> Open this from the app sidebar → Reports. If you do not see it, your role may not have access — ask your clinic admin.
      </div>
    </div>
  );
}
