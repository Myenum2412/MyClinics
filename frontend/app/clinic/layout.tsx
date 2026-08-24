"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { getOwnClinic } from "@/lib/clinic-api";
import { DoctorSidebar } from "@/components/clinic/doctor-sidebar";
import { PatientHeader } from "@/components/clinic/patient-header";
import { PatientBottomNav } from "@/components/clinic/patient-bottom-nav";
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
  const [clinicName, setClinicName] = useState("Meenu Care");

  useEffect(() => {
    if (!session?.clinicId) return;
    let active = true;
    getOwnClinic(session.clinicId)
      .then((clinic) => {
        if (active && clinic?.name) setClinicName(clinic.name);
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
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <Skeleton className="h-10 w-64 rounded-xl" />
      </div>
    );
  }

  const isPatient = session.role === "patient";

  return (
    <SidebarProvider>
      {session.role === "doctor" ? (
        <DoctorSidebar
          clinicName={clinicName}
          clinicId={session.clinicId ?? ""}
          user={{ name: session.name ?? "User", email: session.email ?? "" }}
        />
      ) : isPatient ? (
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
        {isPatient ? <PatientHeader clinicName={clinicName} /> : <WorkspaceHeader />}
        <div
          className={`flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 ${
            isPatient ? "pb-24 md:pb-8" : ""
          }`}
        >
          {children}
        </div>
        {isPatient && <PatientBottomNav />}
      </SidebarInset>
    </SidebarProvider>
  );
}