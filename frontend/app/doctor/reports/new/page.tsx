import { Toaster } from "@/components/ui/sonner";
import { ReportUploadPage } from "@/components/report-upload-page";
import { getDb } from "@/lib/db";
import type { PatientOption } from "@/lib/report-folders";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const db = await getDb();
  const patientDocs = await db
    .collection("patients")
    .find({})
    .sort({ fullName: 1 })
    .project({ fullName: 1 })
    .toArray();

  const patients: PatientOption[] = patientDocs.map((p) => ({
    id: p._id.toString(),
    fullName: p.fullName,
  }));

  const configError =
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET_NAME
      ? "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME are missing from .env.local."
      : null;

  return (
    <>
      <ReportUploadPage patients={patients} configError={configError} />
      <Toaster />
    </>
  );
}