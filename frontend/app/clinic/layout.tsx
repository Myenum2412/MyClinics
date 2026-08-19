"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { getOwnClinic } from "@/lib/clinic-api";
import { DoctorSidebar } from "@/components/clinic/doctor-sidebar";
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
  const pathname = usePathname();
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

  // Standalone full-width pages (clinic profile) render without the sidebar.
  if (pathname === "/clinic/account") {
    return <div className="min-h-svh bg-white">{children}</div>;
  }

  return (
    <SidebarProvider>
      {session.role === "doctor" ? (
        <DoctorSidebar
          clinicName={clinicName}
          user={{ name: session.name ?? "User", email: session.email ?? "" }}
        />
      ) : (
        <WorkspaceSidebar
          clinicName={clinicName}
          user={{ name: session.name ?? "User", email: session.email ?? "" }}
          role={session.role}
        />
      )}
      <SidebarInset>
        <WorkspaceHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}