import { Toaster } from "@/components/ui/sonner";
import { PatientAppointments } from "@/components/patient-appointments";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";
import { todayDateString } from "@/lib/stats";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'My Appointments',
  description: 'View and manage your appointments with doctors at My Clinics — book, reschedule and track visit history.',
};

export const dynamic = "force-dynamic";

export default async function PatientAppointmentsPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  const today = todayDateString();
  const total = data.appointments.length;
  const upcoming = data.appointments.filter((a) => a.date >= today).length;
  const completed = data.appointments.filter(
    (a) => a.status === "completed"
  ).length;

  return (
    <>
      <PatientAppointments
        appointments={data.appointments}
        stats={[
          {
            name: "Appointments",
            current: total,
            allowed: 20,
            fill: "var(--chart-1)",
          },
          {
            name: "Upcoming",
            current: upcoming,
            allowed: Math.max(total, 1),
            fill: "var(--chart-2)",
          },
          {
            name: "Completed",
            current: completed,
            allowed: Math.max(total, 1),
            fill: "var(--chart-3)",
          },
        ]}
      />
      <Toaster />
    </>
  );
}
