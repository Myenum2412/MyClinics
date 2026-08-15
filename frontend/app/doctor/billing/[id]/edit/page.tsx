import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import { BillFormPage } from "@/components/bill-form-page";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import { auth, canAccessBilling } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canAccessBilling(session.user.role)) {
    redirect("/doctor");
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const doc = (await db
    .collection("bills")
    .findOne({ _id: new ObjectId(id) })) as Record<string, unknown> | null;
  if (!doc) notFound();

  const bill = {
    id: String(doc._id),
    billNumber: String(doc.billNumber ?? ""),
    patientName: String(doc.patientName ?? ""),
    patientPhone: doc.patientPhone ? String(doc.patientPhone) : null,
    doctorId: doc.doctorId ? String(doc.doctorId) : null,
    doctorName: doc.doctorName ? String(doc.doctorName) : null,
    date: String(doc.date ?? ""),
    items: Array.isArray(doc.items)
      ? (doc.items as Record<string, unknown>[]).map((i) => ({
          name: String(i.name ?? ""),
          qty: Number(i.qty ?? 0),
          price: Number(i.price ?? 0),
          amount: Number(i.amount ?? 0),
        }))
      : [],
    subtotal: Number(doc.subtotal ?? 0),
    discount: Number(doc.discount ?? 0),
    taxRate: Number(doc.taxRate ?? 0),
    tax: Number(doc.tax ?? 0),
    total: Number(doc.total ?? 0),
    paymentMethod: String(doc.paymentMethod ?? "—"),
    status: ["paid", "pending", "cancelled"].includes(String(doc.status))
      ? (String(doc.status) as "paid" | "pending" | "cancelled")
      : "pending",
    notes: doc.notes ? String(doc.notes) : null,
    createdAt: doc.createdAt ? String(doc.createdAt) : "",
  };

  const patientDocs = await db
    .collection(DB_COLLECTIONS.patients)
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

  const serviceDocs = await db
    .collection(DB_COLLECTIONS.services)
    .find({})
    .sort({ name: 1 })
    .toArray();
  const services = serviceDocs.map((s) => ({
    id: s._id.toString(),
    name: String(s.name ?? ""),
    category: s.category ? String(s.category) : null,
    price: Number(s.price) || 0,
    isActive: s.isActive !== false,
    createdAt: s.createdAt ? String(s.createdAt) : "",
  }));

  return (
    <>
      <BillFormPage initial={bill} patients={patients} services={services} />
      <Toaster />
    </>
  );
}