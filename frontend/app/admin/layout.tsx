"use client";

import { useRequireRole } from "@/hooks/use-clinic-session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { WorkspaceHeader } from "@/components/clinic/workspace-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useRequireRole("platform_admin");

  if (!session) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar
        user={{ name: session.name ?? "Platform Admin", email: session.email ?? "" }}
      />
      <SidebarInset>
        <WorkspaceHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}