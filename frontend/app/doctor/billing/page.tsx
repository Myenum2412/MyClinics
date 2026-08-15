import { Toaster } from "@/components/ui/sonner";
import { BillingTabs } from "@/components/billing-tabs";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import { round2 } from "@/lib/billing";
import { startOfMonthDate } from "@/lib/stats";
import { auth, canAccessBilling } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user || !canAccessBilling(session.user.role)) {
    redirect("/doctor");
  }

  const db = await getDb();

  const docs = await db
    .collection(DB_COLLECTIONS.bills)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const bills = docs.map((d) => ({
    id: d._id.toString(),
    billNumber: d.billNumber,
    patientName: d.patientName,
    patientPhone: d.patientPhone ?? null,
    doctorId: d.doctorId ?? null,
    doctorName: d.doctorName ?? null,
    date: d.date,
    items: Array.isArray(d.items) ? d.items : [],
    subtotal: d.subtotal ?? 0,
    discount: d.discount ?? 0,
    taxRate: d.taxRate ?? 0,
    tax: d.tax ?? 0,
    total: d.total ?? 0,
    paymentMethod: d.paymentMethod ?? "Cash",
    status: d.status ?? "pending",
    notes: d.notes ?? null,
    createdAt: d.createdAt,
  }));

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

  const monthStart = startOfMonthDate();
  const totalCount = docs.length;
  const monthCount = docs.filter(
    (d) => d.createdAt instanceof Date && d.createdAt >= monthStart
  ).length;
  const pendingCount = docs.filter((d) => d.status === "pending").length;

  let monthRevenue = 0;
  let monthCollected = 0;
  for (const d of docs) {
    if (d.createdAt instanceof Date && d.createdAt >= monthStart) {
      const total = Number(d.total) || 0;
      monthRevenue += total;
      if (d.status === "paid") monthCollected += total;
    }
  }
  monthRevenue = round2(monthRevenue);
  monthCollected = round2(monthCollected);

  return (
    <>
      <BillingTabs
        initialBills={bills}
        stats={[
          {
            name: "Total Bills",
            current: totalCount,
            allowed: 100,
            fill: "var(--chart-1)",
          },
          {
            name: "This Month",
            current: monthCount,
            allowed: 50,
            fill: "var(--chart-2)",
          },
          {
            name: "Pending",
            current: pendingCount,
            allowed: Math.max(totalCount, 1),
            fill: "var(--chart-3)",
          },
          {
            name: "Collected (Month)",
            current: monthCollected,
            allowed: Math.max(monthRevenue, 1),
            fill: "var(--chart-4)",
          },
        ]}
        patients={patients}
        services={services}
      />
      <Toaster />
    </>
  );
}
