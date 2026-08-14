import { Toaster } from "@/components/ui/sonner";
import { BillFormPage } from "@/components/bill-form-page";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewBillPage() {
  const db = await getDb();
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
      <BillFormPage patients={patients} />
      <Toaster />
    </>
  );
}