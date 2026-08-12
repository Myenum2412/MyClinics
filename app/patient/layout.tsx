import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PatientSidebar } from "@/components/patient-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "patient") {
    redirect("/dashboard");
  }

  return (
    <SidebarProvider>
      <PatientSidebar
        user={{
          name: session.user.name ?? "Patient",
          email: session.user.email ?? "",
          image: session.user.image ?? null,
          role: session.user.role ?? "patient",
        }}
      />
      <SidebarInset>
        <DashboardHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
