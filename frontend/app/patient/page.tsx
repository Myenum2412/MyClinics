import { Toaster } from "@/components/ui/sonner";
import {
  AppointmentsTableCard,
  BillsTableCard,
  DoctorsTableCard,
  MedicinesTableCard,
  ReportsTableCard,
} from "@/components/patient-tables";
import { PatientUnlinked } from "@/components/patient-unlinked";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPatientData } from "@/lib/patient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Patient Dashboard',
  description: 'Your health overview at My Clinics — appointments, medicines, billing and medical reports in one place.',
};

export const dynamic = "force-dynamic";

// Dashboard tables are capped at this many rows.
const MAX_ROWS = 3;

export default async function PatientDashboardPage() {
  const session = await auth();
  const db = await getDb();
  const data = await loadPatientData(db, session);
  if (!data) return <PatientUnlinked />;

  const { patient, appointments, reports, bills, prescriptions, doctors } = data;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {patient.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {patient.age ? `${patient.age} years` : "Age n/a"}
          {patient.gender ? ` · ${patient.gender}` : ""}
          {patient.mobile ? ` · ${patient.mobile}` : ""}
          {patient.email ? ` · ${patient.email}` : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AppointmentsTableCard
          appointments={appointments}
          maxRows={MAX_ROWS}
          title="Recent Appointments"
          description="Your latest bookings"
          href="/patient/appointments"
        />
        <BillsTableCard
          bills={bills}
          maxRows={MAX_ROWS}
          title="Recent Invoices"
          description="Your latest bills"
          href="/patient/billing"
        />
        <MedicinesTableCard
          prescriptions={prescriptions}
          maxRows={MAX_ROWS}
          title="Current Medicines"
          description="Your latest prescriptions"
          href="/patient/medicines"
        />
        <ReportsTableCard
          reports={reports}
          maxRows={MAX_ROWS}
          title="Recent Reports"
          description="Your latest documents"
          href="/patient/reports"
        />
        <DoctorsTableCard
          doctors={doctors}
          maxRows={MAX_ROWS}
          title="Your Doctors"
          description="Doctors who have treated you"
          href="/patient/doctors"
        />
      </div>

      <Toaster />
    </div>
  );
}