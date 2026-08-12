import { Toaster } from "@/components/ui/sonner";
import { PrescriptionsView } from "@/components/prescriptions-view";
import { getDb } from "@/lib/db";
import { startOfMonthDate, todayDateString } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function PrescriptionsPage() {
  const db = await getDb();

  const [docs, patientDocs] = await Promise.all([
    db
      .collection("prescriptions")
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

  const prescriptions = docs.map((d) => ({
    id: d._id.toString(),
    patientName: d.patientName,
    age: d.age ?? null,
    gender: d.gender ?? null,
    phone: d.phone ?? null,
    visitDate: d.visitDate,
    diagnosis: d.diagnosis,
    medicines: Array.isArray(d.medicines) ? d.medicines : [],
    symptoms: d.symptoms ?? null,
    testsRecommended: d.testsRecommended ?? null,
    followUpDate: d.followUpDate ?? null,
    doctorName: d.doctorName ?? null,
  }));

  const today = todayDateString();
  const totalRx = docs.length;
  const thisMonthRx = docs.filter(
    (d) => d.createdAt instanceof Date && d.createdAt >= startOfMonthDate()
  ).length;
  const followUpsDue = docs.filter(
    (d) => typeof d.followUpDate === "string" && d.followUpDate && d.followUpDate <= today
  ).length;
  const medicinesTotal = docs.reduce(
    (sum, d) => sum + (Array.isArray(d.medicines) ? d.medicines.length : 0),
    0
  );

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
      <PrescriptionsView
        initialPrescriptions={prescriptions}
        patients={patients}
        stats={[
          {
            name: "Total",
            current: totalRx,
            allowed: 100,
            fill: "var(--chart-1)",
          },
          {
            name: "This Month",
            current: thisMonthRx,
            allowed: 60,
            fill: "var(--chart-2)",
          },
          {
            name: "Follow-ups Due",
            current: followUpsDue,
            allowed: Math.max(totalRx, 1),
            fill: "var(--chart-3)",
          },
          {
            name: "Medicines Given",
            current: medicinesTotal,
            allowed: 500,
            fill: "var(--chart-4)",
          },
        ]}
      />
      <Toaster />
    </>
  );
}
