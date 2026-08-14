import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import { PrescriptionFormPage } from "@/components/prescription-form-page";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditPrescriptionPage({
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

  const patientDocs = await db
    .collection("patients")
    .find(
      {},
      {
        projection: {
          fullName: 1,
          mobile: 1,
          secondaryMobile: 1,
          age: 1,
          gender: 1,
          email: 1,
          whatsapp: 1,
        },
      }
    )
    .toArray();
  const patients = patientDocs.map((p) => ({
    id: p._id.toString(),
    fullName: p.fullName,
    mobile: p.mobile,
    secondaryMobile: p.secondaryMobile ?? null,
    age: p.age ?? null,
    gender: p.gender ?? null,
    email: p.email ?? null,
    whatsapp: p.whatsapp ?? null,
  }));

  return (
    <>
      <PrescriptionFormPage initial={prescription} patients={patients} />
      <Toaster />
    </>
  );
}