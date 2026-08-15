import { Toaster } from "@/components/ui/sonner";
import { DoctorsView } from "@/components/doctors-view";
import { getDb } from "@/lib/db";

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
    state: d.state ? String(d.state) : null,
    consultationFee: typeof d.consultationFee === "number" ? d.consultationFee : null,
    experience: d.experience ? String(d.experience) : null,
    gender: d.gender ? String(d.gender) : null,
    languages: Array.isArray(d.languages) ? d.languages.map(String) : [],
    registrationNumber: d.registrationNumber ? String(d.registrationNumber) : null,
    bio: d.bio ? String(d.bio) : null,
    address: d.address ? String(d.address) : null,
    schedule: Array.isArray(d.schedule)
      ? d.schedule
          .map((s) => ({
            day: typeof s?.day === "string" ? s.day : "",
            start: s?.start ? String(s.start) : null,
            end: s?.end ? String(s.end) : null,
          }))
          .filter((s) => Boolean(s.day))
      : [],
    image: d.image ? String(d.image) : null,
    status:
      d.status === "terminated"
        ? ("terminated" as const)
        : ("active" as const),
    createdAt: d.createdAt,
  }));

  const totalDoctors = doctorDocs.length;
  const specialties = new Set(
    doctorDocs.map((d) => d.specialty).filter((s) => typeof s === "string" && s)
  ).size;
  const terminatedCount = doctorDocs.filter(
    (d) => d.status === "terminated"
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
            name: "Terminated",
            current: terminatedCount,
            allowed: Math.max(totalDoctors, 1),
            fill: "var(--chart-3)",
          },
        ]}
      />
      <Toaster />
    </>
  );
}
