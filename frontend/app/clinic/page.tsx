"use client";

import { useRequireRole } from "@/hooks/use-clinic-session";
import { DoctorDashboard } from "@/components/clinic/dashboards/doctor-dashboard";
import { PatientDashboard } from "@/components/clinic/dashboards/patient-dashboard";

export default function ClinicPage() {
  const session = useRequireRole("patient");

  if (!session) return null;

  if (session.role === "patient") {
    return <PatientDashboard session={session} />;
  }

  return <DoctorDashboard session={session} />;
}
