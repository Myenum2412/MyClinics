import { Toaster } from "@/components/ui/sonner";
import Stats07 from "@/components/stats-07";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Patient Dashboard',
  description: 'Your health overview at My Clinics — appointments, medicines, billing and medical reports in one place.',
};

export const dynamic = "force-dynamic";

export default async function PatientDashboardPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  const { patient, appointments, reports, bills, prescriptions } = data;
  const medicineCount = new Set(
    prescriptions.flatMap((p) => p.medicines.map((m) => m.name.trim()).filter(Boolean))
  ).size;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {patient.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {patient.age ? `${patient.age} years` : "Age n/a"}
          {patient.gender ? ` · ${patient.gender}` : ""}
          {patient.mobile ? ` · ${patient.mobile}` : ""}
          {patient.email ? ` · ${patient.email}` : ""}
        </p>
      </div>

      <Stats07
        title="Your Health Overview"
        description="A snapshot of your records at the clinic."
        items={[
          {
            name: "Appointments",
            current: appointments.length,
            allowed: 20,
            fill: "var(--chart-1)",
          },
          {
            name: "Medical Reports",
            current: reports.length,
            allowed: 20,
            fill: "var(--chart-2)",
          },
          {
            name: "Invoices",
            current: bills.length,
            allowed: 20,
            fill: "var(--chart-3)",
          },
          {
            name: "Medicines",
            current: medicineCount,
            allowed: 20,
            fill: "var(--chart-4)",
          },
        ]}
      />

      <Toaster />
    </div>
  );
}