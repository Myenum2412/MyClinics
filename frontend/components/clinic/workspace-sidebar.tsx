"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import type { ClinicRole } from "@/lib/clinic-api"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import {
  CalendarDaysIcon, Squares2X2Icon as LayoutDashboardIcon, BeakerIcon as PillIcon,
  ReceiptPercentIcon as ReceiptTextIcon, Cog6ToothIcon as Settings2Icon,
  IdentificationIcon as StethoscopeIcon, UsersIcon, ClipboardDocumentListIcon as ClipboardListIcon,
  BellIcon, InboxIcon, ClipboardDocumentCheckIcon as RecordsIcon, FolderOpenIcon, ChartBarIcon,
} from "@heroicons/react/24/outline";
import { Pill, HeartPulse } from "lucide-react";

export function WorkspaceSidebar({
  user, clinicName, role, clinicId, ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string }
  clinicName: string
  role: ClinicRole
  clinicId: string
}) {
  const pathname = usePathname()

  const teams = [
    {
      name: clinicName,
      logo: <Image src="/logo.png" alt={clinicName} width={32} height={32} className="size-full object-contain" />,
      plan: role.replace("_", " "),
    },
  ]

  const allNav = [
    { title: "Dashboard", url: "/clinic", icon: <LayoutDashboardIcon className="size-4" />, isActive: pathname === "/clinic", roles: ["patient","doctor","staff","clinic_admin"] },
    { title: "Appointments", url: "/clinic/appointments", icon: <CalendarDaysIcon className="size-4" />, roles: ["patient","doctor","staff","clinic_admin"], items: [] as any },
    { title: "Patients", url: "/clinic/patients", icon: <UsersIcon className="size-4" />, roles: ["doctor","staff","clinic_admin"] },
    { title: "Medical Records", url: role === "patient" ? "/clinic/patient/medical-records" : "/clinic/medical-record", icon: <FolderOpenIcon className="size-4" />, roles: ["patient","doctor","staff","clinic_admin"] },
    { title: "Treatment", url: "/clinic/complaints", icon: <HeartPulse className="size-4" />, roles: ["doctor","staff","clinic_admin"] },
    { title: "Prescriptions", url: "/clinic/prescriptions", icon: <PillIcon className="size-4" />, roles: ["patient","doctor","staff","clinic_admin"] },
    { title: "Medicine", url: "/clinic/records", icon: <RecordsIcon className="size-4" />, roles: ["patient","doctor","staff","clinic_admin"] },
    { title: "Pharmacy", url: "#", icon: <Pill className="size-4" />, isActive: pathname.startsWith("/clinic/pharmacy"), roles: ["clinic_admin","pharmacy_manager","pharmacist","inventory_staff","billing_staff"], items: [
        { title: "Inventory", url: "/clinic/pharmacy/inventory" },
        { title: "Stock History", url: "/clinic/pharmacy/stock-history" },
        { title: "Purchases", url: "/clinic/pharmacy/purchases" },
        { title: "Sales", url: "/clinic/pharmacy/sales" },
        { title: "Suppliers", url: "/clinic/pharmacy/suppliers" },
      ]},
    { title: "Billing", url: "/clinic/billing", icon: <ReceiptTextIcon className="size-4" />, roles: ["patient","doctor","staff","clinic_admin"] },
    { title: "Reports", url: "/clinic/reports", icon: <ChartBarIcon className="size-4" />, roles: ["staff","clinic_admin"] },
    { title: "Notifications", url: "/clinic/notifications", icon: <BellIcon className="size-4" />, roles: ["doctor","staff","clinic_admin"] },
    { title: "AI Assistant", url: "/clinic/ai-assistant", icon: <Image src="/aidps.png" alt="AI" width={20} height={20} className="size-4 rounded-full object-cover" />, roles: ["patient","doctor","staff","clinic_admin"] },
    { title: "Doctors", url: "/clinic/doctors", icon: <StethoscopeIcon className="size-4" />, roles: ["doctor","staff","clinic_admin"] },
    { title: "Leads", url: "/clinic/leads", icon: <InboxIcon className="size-4" />, roles: ["staff","clinic_admin"] },
    { title: "Audit Logs", url: "/clinic/audit-logs", icon: <ClipboardListIcon className="size-4" />, roles: ["clinic_admin"] },
    { title: "Clinic Profile", url: "/clinic/profile", icon: <Settings2Icon className="size-4" />, roles: ["staff","clinic_admin"] },
    { title: "Settings", url: "/clinic/settings", icon: <Settings2Icon className="size-4" />, roles: ["staff","clinic_admin"] },
  ]

  const filtered = allNav.filter((i:any) => (i.roles as string[]).includes(role))
  // group into NavMain structure: each as separate item; NavMain handles collapsible if items provided
  const navMain = filtered.map((i:any) => ({
    title: i.title,
    url: i.url,
    icon: i.icon,
    isActive: i.isActive ?? (pathname === i.url || pathname.startsWith(i.url + "/")),
    ...(i.items?.length ? { items: i.items } : {}),
  }))

  const projects = filtered.slice(0,3).map((i:any) => ({ name: i.title, url: i.url === "#" ? "/clinic/pharmacy/inventory" : i.url, icon: i.icon }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} clinicId={clinicId} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
