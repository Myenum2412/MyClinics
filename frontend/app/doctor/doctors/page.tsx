import { Toaster } from "@/components/ui/sonner";
import { DoctorsView } from "@/components/doctors-view";
import { getDb } from "@/lib/db";
import { startOfMonthDate } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  const db = await getDb();

  const doctorDocs = await db
    .collection("users")
    .find({ role: "doctor" })
    .sort({ createdAt: -1 })
    .toArray();

  const doctors = doctorDocs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    email: d.email,
    specialty: d.specialty ?? null,
    mobile: d.mobile ?? null,
    qualifications: d.qualifications ?? null,
    city: d.city ?? null,
    createdAt: d.createdAt,
  }));

  const totalDoctors = doctorDocs.length;
  const monthStart = startOfMonthDate();
  const newThisMonth = doctorDocs.filter(
    (d) => d.createdAt instanceof Date && d.createdAt >= monthStart
  ).length;
  const specialties = new Set(
    doctorDocs.map((d) => d.specialty).filter((s) => typeof s === "string" && s)
  ).size;
  const withContact = doctorDocs.filter(
    (d) => typeof d.mobile === "string" && d.mobile
  ).length;

  return (
    <>
      <DoctorsView
        initialDoctors={doctors}
        stats={[
          {
            name: "Total Doctors",
            current: totalDoctors,
            allowed: 30,
            fill: "var(--chart-1)",
          },
          {
            name: "Specialties",
            current: specialties,
            allowed: 20,
            fill: "var(--chart-2)",
          },
          {
            name: "New This Month",
            current: newThisMonth,
            allowed: Math.max(totalDoctors, 1),
            fill: "var(--chart-3)",
          },
          {
            name: "With Contact",
            current: withContact,
            allowed: Math.max(totalDoctors, 1),
            fill: "var(--chart-4)",
          },
        ]}
      />
      <Toaster />
    </>
  );
}
