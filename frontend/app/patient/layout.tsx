import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getClinicName } from "@/lib/clinic-name";
import { PatientSidebar } from "@/components/patient-sidebar";
import { DoctorHeader } from "@/components/doctor-header";
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
    redirect("/doctor");
  }
  const clinicName = await getClinicName();

  return (
    <SidebarProvider>
      <PatientSidebar
        clinicName={clinicName}
        user={{
          name: session.user.name ?? "Patient",
          email: session.user.email ?? "",
          image: session.user.image ?? null,
          role: session.user.role ?? "patient",
        }}
      />
      <SidebarInset>
        <DoctorHeader clinicName={clinicName} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
