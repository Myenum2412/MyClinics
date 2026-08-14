import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import { PrescriptionDetails } from "@/components/prescription-details";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PrescriptionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const doc = (await db
    .collection("prescriptions")
    .findOne({ _id: new ObjectId(id) })) as Record<string, unknown> | null;
  if (!doc) notFound();

  const prescription = {
    id: String(doc._id),
    patientName: String(doc.patientName ?? ""),
    age: doc.age ? Number(doc.age) : null,
    gender: doc.gender ? String(doc.gender) : null,
    phone: doc.phone ? String(doc.phone) : null,
    visitDate: String(doc.visitDate ?? ""),
    diagnosis: String(doc.diagnosis ?? ""),
    medicines: Array.isArray(doc.medicines)
      ? (doc.medicines as Record<string, unknown>[]).map((m) => ({
          name: String(m.name ?? ""),
          frequency: String(m.frequency ?? ""),
          duration: String(m.duration ?? ""),
          beforeAfterFood: String(m.beforeAfterFood ?? ""),
          specialInstructions: String(m.specialInstructions ?? ""),
        }))
      : [],
    symptoms: doc.symptoms ? String(doc.symptoms) : null,
    testsRecommended: doc.testsRecommended
      ? String(doc.testsRecommended)
      : null,
    followUpDate: doc.followUpDate ? String(doc.followUpDate) : null,
    doctorName: doc.doctorName ? String(doc.doctorName) : null,
  };

  return (
    <>
      <PrescriptionDetails prescription={prescription} />
      <Toaster />
    </>
  );
}