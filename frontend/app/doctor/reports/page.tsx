import { Toaster } from "@/components/ui/sonner";
import { ReportsView } from "@/components/reports-view";
import { getDb } from "@/lib/db";
import type { PatientOption, ReportFile } from "@/lib/report-folders";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const db = await getDb();
  const [fileDocs, patientDocs] = await Promise.all([
    db
      .collection("reports")
      .find({})
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection("patients")
      .find({})
      .sort({ fullName: 1 })
      .project({ fullName: 1 })
      .toArray(),
  ]);

  const files: ReportFile[] = fileDocs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    size: d.size,
    type: d.type,
    extension: d.extension ?? "",
    folderId: d.folderId ?? null,
    category: d.category ?? null,
    patientId: d.patientId ?? null,
    patientName: d.patientName ?? null,
    prescriptionId: d.prescriptionId ?? null,
    prescriptionLabel: d.prescriptionLabel ?? null,
    uploadedBy: d.uploadedBy ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: (d.updatedAt ?? d.createdAt).toISOString(),
  }));

  const patients: PatientOption[] = patientDocs.map((p) => ({
    id: p._id.toString(),
    fullName: p.fullName,
  }));

  const configError = !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET_NAME
    ? "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME are missing from .env.local."
    : null;

  return (
    <>
      <ReportsView
        initialFiles={files}
        initialPatients={patients}
        configError={configError}
      />
      <Toaster />
    </>
  );
}
