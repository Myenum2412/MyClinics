"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { getOwnClinic } from "@/lib/clinic-api";
import { DoctorSidebar } from "@/components/clinic/doctor-sidebar";
import { PatientHeader } from "@/components/clinic/patient-header";
import { PatientSidebar } from "@/components/clinic/patient-sidebar";
import { WorkspaceSidebar } from "@/components/clinic/workspace-sidebar";
import { WorkspaceHeader } from "@/components/clinic/workspace-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useRequireRole("patient");
  const [clinicName, setClinicName] = useState("My Clinic");

  useEffect(() => {
    if (!session?.clinicId) return;
    let active = true;
    getOwnClinic(session.clinicId)
      .then((clinic) => {
        if (active) setClinicName(clinic.name);
      })
      .catch(() => {
        /* keep default */
      });
    return () => {
      active = false;
    };
  }, [session?.clinicId]);

  if (!session) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      {session.role === "doctor" ? (
        <DoctorSidebar
          clinicName={clinicName}
          clinicId={session.clinicId ?? ""}
          user={{ name: session.name ?? "User", email: session.email ?? "" }}
        />
      ) : session.role === "patient" ? (
        <PatientSidebar
          clinicName={clinicName}
          user={{ name: session.name ?? "User", email: session.email ?? "" }}
        />
      ) : (
        <WorkspaceSidebar
          clinicName={clinicName}
          clinicId={session.clinicId ?? ""}
          user={{ name: session.name ?? "User", email: session.email ?? "" }}
          role={session.role}
        />
      )}
      <SidebarInset>
        {session.role === "patient" ? <PatientHeader /> : <WorkspaceHeader />}
        <div className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}