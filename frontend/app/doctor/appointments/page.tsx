import { Toaster } from "@/components/ui/sonner";
import { AppointmentsView } from "@/components/appointments-view";
import { getDb } from "@/lib/db";
import { mondayDateString, todayDateString } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const db = await getDb();

  const [doctors, patientDocs, appointmentDocs, todayCount, weekCount, pendingCount] =
    await Promise.all([
      db
        .collection("users")
        .find({ role: "doctor" }, { projection: { name: 1 } })
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
      db
        .collection("appointments")
        .find({})
        .sort({ createdAt: -1 })
        .toArray(),
      db.collection("appointments").countDocuments({ date: todayDateString() }),
      db.collection("appointments").countDocuments({
        date: { $gte: mondayDateString(), $lte: todayDateString() },
      }),
      db.collection("appointments").countDocuments({ status: "pending" }),
    ]);

  const appointments = appointmentDocs.map((a) => ({
    id: a._id.toString(),
    fullName: a.fullName,
    mobile: a.mobile,
    secondaryMobile: a.secondaryMobile ?? null,
    age: a.age ?? null,
    gender: a.gender ?? null,
    email: a.email ?? null,
    whatsapp: a.whatsapp ?? null,
    doctorId: a.doctorId?.toString() ?? null,
    doctorName: a.doctorName ?? null,
    department: a.department ?? null,
    date: a.date,
    time: a.time,
    type: a.type,
    reason: a.reason ?? null,
    status: a.status,
    bookingSource: a.bookingSource ?? "manual",
    notes: a.notes ?? null,
    counter: a.counter ?? null,
  }));

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

  const totalAppointments = appointmentDocs.length;

  return (
    <>
      <AppointmentsView
        doctors={doctors.map((d) => ({
          id: d._id.toString(),
          name: d.name,
        }))}
        patients={patients}
        initialAppointments={appointments}
        stats={[
          {
            name: "Today",
            current: todayCount,
            allowed: 20,
            fill: "var(--chart-1)",
          },
          {
            name: "This Week",
            current: weekCount,
            allowed: 60,
            fill: "var(--chart-2)",
          },
          {
            name: "Pending",
            current: pendingCount,
            allowed: Math.max(totalAppointments, 1),
            fill: "var(--chart-3)",
          },
          {
            name: "Total",
            current: totalAppointments,
            allowed: 100,
            fill: "var(--chart-4)",
          },
        ]}
      />
      <Toaster />
    </>
  );
}
