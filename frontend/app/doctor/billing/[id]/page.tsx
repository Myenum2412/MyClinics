import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import { BillDetails } from "@/components/bill-details";
import { getDb } from "@/lib/db";
import { auth, canAccessBilling } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BillDetailsPage({
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

  return (
    <>
      <BillDetails bill={bill} />
      <Toaster />
    </>
  );
}