import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Appointments — My Clinics Docs",
  description: "Book, reschedule, and track every visit — with queue tokens and WhatsApp reminders.",
};
export default function Page() {
  return (
    <div className="px-6 py-10 lg:px-10">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Appointments</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Book, reschedule, and track every visit — with queue tokens and WhatsApp reminders.</p>
      <div className="mt-8">
        <h2 className="text-lg font-semibold">How to create / use Appointments</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
          <li>Click Appointments → New Appointment → pick patient, doctor, date and time slot.</li><li>Confirm — a token number is assigned automatically and the slot is locked.</li><li>To reschedule, open the appointment and pick a new slot; to cancel, use Cancel — both notify the patient.</li><li>WhatsApp and in-app reminders are sent before the visit; the queue updates live on the dashboard.</li>
        </ol>
      </div>
      <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <span className="font-semibold">How it works:</span> Everything is saved to your clinic workspace instantly. You see only your clinic data, and each role (patient, doctor, admin) sees only what they are allowed to — like separate locked drawers.
      </div>
      <div className="mt-4 rounded-lg border px-4 py-3 text-sm">
        <span className="font-semibold">Tip:</span> Open this from the app sidebar → Appointments. If you do not see it, your role may not have access — ask your clinic admin.
      </div>
    </div>
  );
}
