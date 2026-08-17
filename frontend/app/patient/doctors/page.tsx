import { Toaster } from "@/components/ui/sonner";
import { PatientDoctors } from "@/components/patient-doctors";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'My Doctors',
  description: 'Browse the doctors at My Clinics and book your next appointment.',
};

export const dynamic = "force-dynamic";

export default async function PatientDoctorsPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  return (
    <>
      <PatientDoctors
        doctors={data.doctors}
        appointments={data.appointments}
      />
      <Toaster />
    </>
  );
}
