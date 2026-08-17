import { Toaster } from "@/components/ui/sonner";
import { PatientProfileView } from "@/components/patient-profile";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Your personal details, emergency contact and medical history at My Clinics.',
};

export const dynamic = "force-dynamic";

export default async function PatientProfilePage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  return (
    <>
      <PatientProfileView
        patient={data.patient}
        appointments={data.appointments.length}
        prescriptions={data.prescriptions.length}
        bills={data.bills.length}
        reports={data.reports.length}
      />
      <Toaster />
    </>
  );
}