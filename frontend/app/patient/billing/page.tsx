import { Toaster } from "@/components/ui/sonner";
import { PatientBilling } from "@/components/patient-billing";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'My Billing & Payments',
  description: 'Track your bills, payments and outstanding amounts at My Clinics.',
};

export const dynamic = "force-dynamic";

export default async function PatientBillingPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  return (
    <>
      <PatientBilling
        bills={data.bills}
        appointments={data.appointments}
        prescriptions={data.prescriptions}
      />
      <Toaster />
    </>
  );
}
