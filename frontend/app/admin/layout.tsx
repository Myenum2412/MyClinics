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
        <div className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}