"use client"
import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { CalendarDaysIcon, Squares2X2Icon as LayoutDashboardIcon, BeakerIcon as PillIcon, IdentificationIcon as StethoscopeIcon, UsersIcon, BellIcon, ClipboardDocumentCheckIcon as RecordsIcon, FolderOpenIcon } from "@heroicons/react/24/outline";
import { HeartPulse } from "lucide-react";

export function DoctorSidebar({ user, clinicName, clinicId, ...props }: React.ComponentProps<typeof Sidebar> & { user: { name: string; email: string }; clinicName: string; clinicId: string }) {
  const pathname = usePathname()
  const teams = [{ name: clinicName, logo: <Image src="/logo.png" alt={clinicName} width={32} height={32} className="size-full object-contain" />, plan: "Doctor Workspace" }]
  const navMain = [
    { title: "Dashboard", url: "/clinic", icon: <LayoutDashboardIcon className="size-4" />, isActive: pathname === "/clinic" },
    { title: "Appointments", url: "/clinic/appointments", icon: <CalendarDaysIcon className="size-4" />, isActive: pathname.startsWith("/clinic/appointments") },
    { title: "Patients", url: "/clinic/patients", icon: <UsersIcon className="size-4" />, isActive: pathname.startsWith("/clinic/patients") },
    { title: "Medicine", url: "/clinic/records", icon: <RecordsIcon className="size-4" />, isActive: pathname.startsWith("/clinic/records") },
    { title: "Medical Record", url: "/clinic/medical-record", icon: <FolderOpenIcon className="size-4" />, isActive: pathname.startsWith("/clinic/medical-record") },
    { title: "Prescriptions", url: "/clinic/prescriptions", icon: <PillIcon className="size-4" />, isActive: pathname.startsWith("/clinic/prescriptions") },
    { title: "Treatment", url: "/clinic/complaints", icon: <HeartPulse className="size-4" />, isActive: pathname.startsWith("/clinic/complaints") },
    { title: "Doctors", url: "/clinic/doctors", icon: <StethoscopeIcon className="size-4" />, isActive: pathname.startsWith("/clinic/doctors") },
    { title: "Notifications", url: "/clinic/notifications", icon: <BellIcon className="size-4" />, isActive: pathname.startsWith("/clinic/notifications") },
    { title: "AI Assistant", url: "/clinic/ai-assistant", icon: <Image src="/aidps.png" alt="AI" width={20} height={20} className="size-4 rounded-full object-cover" />, isActive: pathname.startsWith("/clinic/ai-assistant") },
  ]
  const projects = navMain.slice(1,4).map(i => ({ name: i.title, url: i.url, icon: i.icon }))
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader><TeamSwitcher teams={teams} /></SidebarHeader>
      <SidebarContent><NavMain items={navMain} /><NavProjects projects={projects} /></SidebarContent>
      <SidebarFooter><NavUser user={user} clinicId={clinicId} /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
