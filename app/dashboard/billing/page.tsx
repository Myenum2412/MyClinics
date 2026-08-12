import { Toaster } from "@/components/ui/sonner";
import { BillingView } from "@/components/billing-view";
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
    redirect("/dashboard");
  }

  const db = await getDb();

  const [docs, patientDocs] = await Promise.all([
    db
      .collection(DB_COLLECTIONS.bills)
      .find({})
      .sort({ createdAt: -1 })
      .toArray(),
    db
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
      .toArray(),
  ]);

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
      <BillingView
        initialBills={bills}
        patients={patients}
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
      />
      <Toaster />
    </>
  );
}
