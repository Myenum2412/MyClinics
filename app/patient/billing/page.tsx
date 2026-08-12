import { Toaster } from "@/components/ui/sonner";
import { PatientBilling } from "@/components/patient-billing";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

export const dynamic = "force-dynamic";

export default async function PatientBillingPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  return (
    <>
      <PatientBilling bills={data.bills} />
      <Toaster />
    </>
  );
}
