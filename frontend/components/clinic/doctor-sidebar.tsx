"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  CalendarDaysIcon,
  DocumentTextIcon as FileTextIcon,
  Squares2X2Icon as LayoutDashboardIcon,
  BeakerIcon as PillIcon,
  IdentificationIcon as StethoscopeIcon,
  UsersIcon,
  BellIcon,
  ClipboardDocumentCheckIcon as RecordsIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { HeartPulse } from "lucide-react";

interface NavItem {
  title: string
  url: string
  icon?: React.ReactNode
  match?: "exact" | "prefix"
}

/**
 * Doctor workspace sidebar — a dedicated navigation for the `doctor` role.
 * Only the modules a doctor can use are listed here; every data view is
 * scoped server-side to the doctor's own patients/appointments (see
 * PatientRepository / AppointmentRepository doctor scope).
 */
const DOCTOR_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "/clinic",
    icon: <LayoutDashboardIcon className="size-6" />,
    match: "exact",
  },
  {
    title: "Appointments",
    url: "/clinic/appointments",
    icon: <CalendarDaysIcon className="size-6" />,
  },
  {
    title: "Patients",
    url: "/clinic/patients",
    icon: <UsersIcon className="size-6" />,
  },
  {
    title: "Doctors",
    url: "/clinic/doctors",
    icon: <StethoscopeIcon className="size-6" />,
  },
  {
    title: "Medicine",
    url: "/clinic/records",
    icon: <RecordsIcon className="size-6" />,
  },
  {
    title: "Medical Record",
    url: "/clinic/medical-record",
    icon: <FolderOpenIcon className="size-6" />,
  },
  {
    title: "Prescriptions",
    url: "/clinic/prescriptions",
    icon: <PillIcon className="size-6" />,
  },
  {
    title: "Treatment",
    url: "/clinic/complaints",
    icon: <HeartPulse className="size-6" />,
  },
  {
    title: "Notifications",
    url: "/clinic/notifications",
    icon: <BellIcon className="size-6" />,
  },
  {
    title: "AI Assistant",
    url: "/clinic/ai-assistant",
    icon: <Image src="/aidps.png" alt="AI" width={24} height={24} className="size-6 rounded-full object-cover" />,
  },
]

export function DoctorSidebar({
  user,
  clinicName,
  clinicId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
  }
  clinicName: string
  clinicId: string
}) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 shrink-0 justify-center border-b bg-sidebar/40 group-data-[collapsible=icon]:h-16 group-data-[collapsible=icon]:justify-center">
        <div className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border shadow-sm">
            <Image
              src="/logo.png"
              alt="My Clinic Logo"
              width={36}
              height={36}
              className="size-9 object-contain"
            />
          </div>
          <div className="grid min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[15px] font-semibold leading-tight tracking-tight text-sidebar-foreground">
              {clinicName}
            </span>
            <span className="truncate text-xs font-medium leading-tight text-muted-foreground capitalize">
              Doctor Workspace
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-0.5 px-3 text-[11px] font-semibold uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu>
            {DOCTOR_NAV_ITEMS.map((item) => {
              const active =
                item.match === "exact"
                  ? pathname === item.url
                  : pathname.startsWith(`${item.url}/`) || pathname === item.url
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={item.title}
                    render={<a href={item.url} />}
                    data-active={active}
                    className="h-11 rounded-lg text-[13.5px] font-medium group-data-[collapsible=icon]:h-12!"
                  >
                    {item.icon}
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} clinicId={clinicId} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}