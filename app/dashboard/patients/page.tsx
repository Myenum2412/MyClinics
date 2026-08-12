import { Toaster } from "@/components/ui/sonner";
import { PatientsView } from "@/components/patients-view";
import { getDb } from "@/lib/db";
import { startOfMonthDate, startOfWeekDate } from "@/lib/stats";
import { auth, isStaffRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const session = await auth();
  const db = await getDb();

  const [patientDocs, newThisWeek, newThisMonth, whatsappCount] = await Promise.all([
    db
      .collection("patients")
      .find({})
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection("patients")
      .countDocuments({ createdAt: { $gte: startOfWeekDate() } }),
    db
      .collection("patients")
      .countDocuments({ createdAt: { $gte: startOfMonthDate() } }),
    db
      .collection("patients")
      .countDocuments({ whatsapp: { $nin: [null, ""] } }),
  ]);

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

  const totalPatients = patientDocs.length;

  return (
    <>
      <PatientsView
        initialPatients={patients}
        hideBilling={isStaffRole(session?.user.role)}
        stats={[
          {
            name: "Total Patients",
            current: totalPatients,
            allowed: 100,
            fill: "var(--chart-1)",
          },
          {
            name: "New This Week",
            current: newThisWeek,
            allowed: 15,
            fill: "var(--chart-2)",
          },
          {
            name: "New This Month",
            current: newThisMonth,
            allowed: 50,
            fill: "var(--chart-3)",
          },
          {
            name: "WhatsApp Contacts",
            current: whatsappCount,
            allowed: Math.max(totalPatients, 1),
            fill: "var(--chart-4)",
          },
        ]}
      />
      <Toaster />
    </>
  );
}
