import { Toaster } from "@/components/ui/sonner";
import { PatientReports } from "@/components/patient-reports";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'My Medical Reports',
  description: 'View, download and share your medical reports securely stored at My Clinics.',
};

export const dynamic = "force-dynamic";

export default async function PatientReportsPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  return (
    <>
      <PatientReports
        files={data.reports}
        appointments={data.appointments}
        prescriptions={data.prescriptions}
        bills={data.bills}
      />
      <Toaster />
    </>
  );
}
