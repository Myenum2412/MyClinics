import { Toaster } from "@/components/ui/sonner";
import { PatientReports } from "@/components/patient-reports";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

export const dynamic = "force-dynamic";

export default async function PatientReportsPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  return (
    <>
      <PatientReports files={data.reports} />
      <Toaster />
    </>
  );
}
