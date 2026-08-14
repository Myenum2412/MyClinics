import { Toaster } from "@/components/ui/sonner";
import { PatientsView } from "@/components/patients-view";
import { getDb } from "@/lib/db";
import { startOfMonthDate, startOfWeekDate } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
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
    bloodGroup: p.bloodGroup ?? null,
    dateOfBirth: p.dateOfBirth ?? null,
    weight: p.weight ?? null,
    height: p.height ?? null,
    guardianName: p.guardianName ?? null,
    emergencyContactName: p.emergencyContactName ?? null,
    emergencyContactPhone: p.emergencyContactPhone ?? null,
    maritalStatus: p.maritalStatus ?? null,
    smoking: p.smoking ?? null,
    alcohol: p.alcohol ?? null,
    address: p.address ?? null,
    city: p.city ?? null,
    pincode: p.pincode ?? null,
    occupation: p.occupation ?? null,
    medicalHistory: p.medicalHistory ?? null,
    allergies: p.allergies ?? null,
    currentMedications: p.currentMedications ?? null,
    previousSurgeries: p.previousSurgeries ?? null,
    familyHistory: p.familyHistory ?? null,
    notes: p.notes ?? null,
  }));

  const totalPatients = patientDocs.length;

  return (
    <>
      <PatientsView
        initialPatients={patients}
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
