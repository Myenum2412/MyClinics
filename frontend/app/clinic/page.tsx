"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { DoctorDashboard } from "@/components/clinic/dashboards/doctor-dashboard";

export default function ClinicPage() {
  const session = useRequireRole("patient");
  const router = useRouter();

  useEffect(() => {
    if (session?.role === "patient") {
      router.replace("/clinic/patient");
    }
  }, [session?.role, router]);

  if (!session) return null;

  if (session.role === "patient") return null;

  return <DoctorDashboard session={session} />;
}
