import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getClinicName } from "@/lib/clinic-name";
import { AppSidebar } from "@/components/app-sidebar";
import { DoctorHeader } from "@/components/doctor-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const clinicName = await getClinicName();

  return (
    <SidebarProvider>
      <AppSidebar
        clinicName={clinicName}
        user={{
          name: session.user.name ?? "Doctor",
          email: session.user.email ?? "",
          image: session.user.image ?? null,
          role: session.user.role ?? "doctor",
        }}
      />
      <SidebarInset>
        <DoctorHeader clinicName={clinicName} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
