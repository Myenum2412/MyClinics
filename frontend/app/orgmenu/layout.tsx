"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClinicSession } from "@/hooks/use-clinic-session";
import { OrgSidebar } from "@/components/org/org-sidebar";
import { WorkspaceHeader } from "@/components/clinic/workspace-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrgMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useClinicSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login?callbackUrl=/orgmenu");
      return;
    }
    if (session.role !== "platform_admin") {
      router.replace(session.role === "patient" ? "/clinic/patient" : "/clinic");
    }
  }, [loading, session, router]);

  if (loading || !session || session.role !== "platform_admin") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <OrgSidebar
        user={{ name: session.name ?? "Org Admin", email: session.email ?? "" }}
      />
      <SidebarInset>
        <WorkspaceHeader />
        <div className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
