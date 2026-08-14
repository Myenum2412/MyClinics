import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import { ReportFilePage } from "@/components/report-file-page";
import { getDb } from "@/lib/db";
import type { ReportFile } from "@/lib/report-folders";

export const dynamic = "force-dynamic";

export default async function ReportFileDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const doc = (await db
    .collection("reports")
    .findOne({ _id: new ObjectId(id) })) as Record<string, unknown> | null;
  if (!doc) notFound();

  const file: ReportFile = {
    id: String(doc._id),
    name: String(doc.name ?? "Unnamed file"),
    size: Number(doc.size ?? 0),
    type: String(doc.type ?? ""),
    extension: doc.extension ? String(doc.extension) : "",
    folderId: null,
    category: doc.category ? String(doc.category) : null,
    patientId: doc.patientId ? String(doc.patientId) : null,
    patientName: doc.patientName ? String(doc.patientName) : null,
    prescriptionId: null,
    prescriptionLabel: doc.prescriptionLabel ? String(doc.prescriptionLabel) : null,
    uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
    createdAt: doc.createdAt ? String(doc.createdAt) : "",
    updatedAt: doc.updatedAt ? String(doc.updatedAt) : "",
  };

  return (
    <>
      <ReportFilePage initialFile={file} />
      <Toaster />
    </>
  );
}