"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { DoctorDashboard } from "@/components/clinic/dashboards/doctor-dashboard";

export default function ClinicPage() {
  const session = useRequireRole("patient");
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    if (session.role === "platform_admin") {
      router.replace("/admin");
      return;
    }
    if (session.role === "patient") {
      router.replace("/clinic/patient");
    }
  }, [session?.role, session, router]);

  if (!session) return null;
  if (session.role === "platform_admin") return null;
  if (session.role === "patient") return null;
  if (!session.clinicId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">No clinic assigned to this account. Please contact your administrator.</p>
        <button onClick={() => router.replace("/login")} className="text-sm underline">Go to login</button>
      </div>
    );
  }

  return <DoctorDashboard session={session} />;
}
