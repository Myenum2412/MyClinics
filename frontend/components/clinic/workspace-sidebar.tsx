"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import type { ClinicRole } from "@/lib/clinic-api"
import { can } from "@/lib/clinic-api"

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
  Squares2X2Icon as LayoutDashboardIcon,
  BeakerIcon as PillIcon,
  ReceiptPercentIcon as ReceiptTextIcon,
  Cog6ToothIcon as Settings2Icon,
  IdentificationIcon as StethoscopeIcon,
  UsersIcon,
  ClipboardDocumentListIcon as ClipboardListIcon,
  BellIcon,
  ClipboardDocumentCheckIcon as RecordsIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  title: string
  url: string
  icon?: React.ReactNode
  match?: "exact" | "prefix"
  roles: ClinicRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "/clinic",
    icon: <LayoutDashboardIcon className="size-6" />,
    match: "exact",
    roles: ["patient", "doctor", "staff", "clinic_admin"],
  },
  {
    title: "Appointments",
    url: "/clinic/appointments",
    icon: <CalendarDaysIcon className="size-6" />,
    roles: ["patient", "doctor", "staff", "clinic_admin"],
  },
  {
    title: "Patients",
    url: "/clinic/patients",
    icon: <UsersIcon className="size-6" />,
    roles: ["doctor", "staff", "clinic_admin"],
  },
  {
    title: "Doctors",
    url: "/clinic/doctors",
    icon: <StethoscopeIcon className="size-6" />,
    roles: ["doctor", "staff", "clinic_admin"],
  },
  {
    title: "Medicine",
    url: "/clinic/records",
    icon: <RecordsIcon className="size-6" />,
    roles: ["patient", "doctor", "staff", "clinic_admin"],
  },
  {
    title: "Medical Record",
    url: "/clinic/medical-record",
    icon: <FolderOpenIcon className="size-6" />,
    roles: ["patient", "doctor", "staff", "clinic_admin"],
  },
  {
    title: "Prescriptions",
    url: "/clinic/prescriptions",
    icon: <PillIcon className="size-6" />,
    roles: ["patient", "doctor", "staff", "clinic_admin"],
  },
  {
    title: "Billing",
    url: "/clinic/billing",
    icon: <ReceiptTextIcon className="size-6" />,
    roles: ["patient", "doctor", "staff", "clinic_admin"],
  },
  {
    title: "Audit Logs",
    url: "/clinic/audit-logs",
    icon: <ClipboardListIcon className="size-6" />,
    roles: ["clinic_admin"],
  },
  {
    title: "Notifications",
    url: "/clinic/notifications",
    icon: <BellIcon className="size-6" />,
    roles: ["doctor", "staff", "clinic_admin"],
  },
  {
    title: "Settings",
    url: "/clinic/settings",
    icon: <Settings2Icon className="size-6" />,
    roles: ["staff", "clinic_admin"],
  },
]

export function WorkspaceSidebar({
  user,
  clinicName,
  role,
  clinicId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
  }
  clinicName: string
  role: ClinicRole
  clinicId: string
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))

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
              {role}
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
            {items.map((item) => {
              const url = item.url === "/clinic/medical-record" && role === "patient"
                ? "/clinic/patient/medical-records"
                : item.url;
              const active =
                item.match === "exact"
                  ? pathname === url
                  : pathname.startsWith(`${url}/`) || pathname === url
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={item.title}
                    render={<a href={url} />}
                    data-active={active}
                    className="h-11 rounded-lg text-[13.5px] font-medium group-data-[collapsible=icon]:h-12! data-[active=true]:bg-blue-50 data-[active=true]:text-blue-600 data-[active=true]:[&>svg]:text-blue-600"
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
