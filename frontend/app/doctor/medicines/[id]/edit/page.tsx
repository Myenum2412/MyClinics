import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import { MedicineFormPage } from "@/components/medicine-form-page";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const doc = (await db
    .collection("medicines")
    .findOne({ _id: new ObjectId(id) })) as Record<string, unknown> | null;
  if (!doc) notFound();

  const initial = {
    id: String(doc._id),
    sno: typeof doc.sno === "number" ? doc.sno : null,
    name: String(doc.name ?? ""),
    category: doc.category ? String(doc.category) : "",
    composition: doc.composition ? String(doc.composition) : "",
    dosage: doc.dosage ? String(doc.dosage) : "",
    frequency: doc.frequency ? String(doc.frequency) : "",
    duration: doc.duration ? String(doc.duration) : "",
    beforeAfterFood: doc.beforeAfterFood ? String(doc.beforeAfterFood) : "",
    instructions: doc.instructions ? String(doc.instructions) : "",
    requiresPrescription: doc.requiresPrescription === true,
    notes: doc.notes ? String(doc.notes) : "",
  };

  return (
    <>
      <MedicineFormPage initial={initial} />
      <Toaster />
    </>
  );
}