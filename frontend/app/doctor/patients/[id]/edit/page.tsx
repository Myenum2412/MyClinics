import { notFound } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { PatientFormPage } from "@/components/patient-form-page";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let doc: Record<string, unknown> | null = null;
  if (ObjectId.isValid(id)) {
    const db = await getDb();
    doc = (await db.collection("patients").findOne({ _id: new ObjectId(id) })) as Record<
      string,
      unknown
    > | null;
  }
  if (!doc) notFound();

  const initial = {
    id: String(doc._id),
    fullName: String(doc.fullName ?? ""),
    mobile: String(doc.mobile ?? ""),
    secondaryMobile: doc.secondaryMobile ? String(doc.secondaryMobile) : null,
    age: doc.age ? Number(doc.age) : null,
    gender: doc.gender ? String(doc.gender) : null,
    email: doc.email ? String(doc.email) : null,
    whatsapp: doc.whatsapp ? String(doc.whatsapp) : null,
    bloodGroup: doc.bloodGroup ? String(doc.bloodGroup) : null,
    dateOfBirth: doc.dateOfBirth ? String(doc.dateOfBirth) : null,
    weight: doc.weight ? Number(doc.weight) : null,
    height: doc.height ? Number(doc.height) : null,
    guardianName: doc.guardianName ? String(doc.guardianName) : null,
    emergencyContactName: doc.emergencyContactName
      ? String(doc.emergencyContactName)
      : null,
    emergencyContactPhone: doc.emergencyContactPhone
      ? String(doc.emergencyContactPhone)
      : null,
    maritalStatus: doc.maritalStatus ? String(doc.maritalStatus) : null,
    smoking: doc.smoking ? String(doc.smoking) : null,
    alcohol: doc.alcohol ? String(doc.alcohol) : null,
    address: doc.address ? String(doc.address) : null,
    city: doc.city ? String(doc.city) : null,
    pincode: doc.pincode ? String(doc.pincode) : null,
    occupation: doc.occupation ? String(doc.occupation) : null,
    medicalHistory: doc.medicalHistory ? String(doc.medicalHistory) : null,
    allergies: doc.allergies ? String(doc.allergies) : null,
    currentMedications: doc.currentMedications
      ? String(doc.currentMedications)
      : null,
    previousSurgeries: doc.previousSurgeries
      ? String(doc.previousSurgeries)
      : null,
    familyHistory: doc.familyHistory ? String(doc.familyHistory) : null,
    notes: doc.notes ? String(doc.notes) : null,
  };

  return (
    <>
      <PatientFormPage initial={initial} />
      <Toaster />
    </>
  );
}