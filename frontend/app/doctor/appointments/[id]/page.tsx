import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import {
  AppointmentHistoryView,
  type HistoryAppointment,
} from "@/components/appointment-history";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppointmentHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const appointment = (await db
    .collection("appointments")
    .findOne({ _id: new ObjectId(id) })) as Record<string, unknown> | null;
  if (!appointment) notFound();

  const mobile = String(appointment.mobile ?? "");
  const [historyDocs, patientDoc] = await Promise.all([
    db
      .collection("appointments")
      .find({ mobile })
      .sort({ date: -1, time: -1 })
      .toArray(),
    db.collection("patients").findOne({ mobile }),
  ]);

  const appointments: HistoryAppointment[] = historyDocs.map((a) => ({
    id: String(a._id),
    fullName: String(a.fullName ?? ""),
    mobile: String(a.mobile ?? ""),
    doctorId: a.doctorId?.toString() ?? null,
    doctorName: a.doctorName ? String(a.doctorName) : null,
    department: a.department ? String(a.department) : null,
    date: String(a.date ?? ""),
    time: String(a.time ?? ""),
    type: String(a.type ?? "in-person"),
    reason: a.reason ? String(a.reason) : null,
    status: String(a.status ?? "pending"),
    bookingSource: a.bookingSource ? String(a.bookingSource) : "manual",
    notes: a.notes ? String(a.notes) : null,
    counter: a.counter != null ? Number(a.counter) : null,
  }));

  const fullName = String(appointment.fullName ?? "");
  const age =
    patientDoc?.age != null
      ? Number(patientDoc.age)
      : appointment.age != null
        ? Number(appointment.age)
        : null;
  const gender =
    (patientDoc?.gender ? String(patientDoc.gender) : null) ??
    (appointment.gender ? String(appointment.gender) : null);

  return (
    <>
      <AppointmentHistoryView
        patient={{
          fullName,
          mobile,
          age,
          gender,
          bloodGroup: patientDoc?.bloodGroup
            ? String(patientDoc.bloodGroup)
            : null,
        }}
        appointments={appointments}
        currentId={id}
      />
      <Toaster />
    </>
  );
}