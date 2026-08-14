import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: session.user.name ?? "Doctor",
          email: session.user.email ?? "",
          image: session.user.image ?? null,
          role: session.user.role ?? "doctor",
        }}
      />
      <SidebarInset>
        <DoctorHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
