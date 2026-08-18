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
  ReceiptPercentIcon as ReceiptTextIcon,
  Cog6ToothIcon as Settings2Icon,
  IdentificationIcon as StethoscopeIcon,
  UsersIcon,
  ClipboardDocumentListIcon as ClipboardListIcon,
  BellIcon,
  ClipboardDocumentCheckIcon as RecordsIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  title: string
  url: string
  icon?: React.ReactNode
  match?: "exact" | "prefix"
  /** Minimum role required to see the item (backend route guards). */
  minRole?: ClinicRole
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "/clinic",
    icon: <LayoutDashboardIcon />,
    match: "exact",
    minRole: "patient",
  },
  {
    title: "Appointments",
    url: "/clinic/appointments",
    icon: <CalendarDaysIcon />,
    minRole: "doctor",
  },
  {
    title: "Patients",
    url: "/clinic/patients",
    icon: <UsersIcon />,
    minRole: "doctor",
  },
  {
    title: "Doctors",
    url: "/clinic/doctors",
    icon: <StethoscopeIcon />,
    minRole: "doctor",
  },

  {
    title: "Medicine",
    url: "/clinic/records",
    icon: <RecordsIcon />,
    minRole: "doctor",
  },
  {
    title: "Prescriptions",
    url: "/clinic/prescriptions",
    icon: <PillIcon />,
    minRole: "doctor",
  },
  {
    title: "Billing",
    url: "/clinic/billing",
    icon: <ReceiptTextIcon />,
    minRole: "staff",
  },
  {
    title: "Reports",
    url: "/clinic/reports",
    icon: <FileTextIcon />,
    minRole: "staff",
  },
  {
    title: "Audit Logs",
    url: "/clinic/audit-logs",
    icon: <ClipboardListIcon />,
    minRole: "clinic_admin",
  },
  {
    title: "Notifications",
    url: "/clinic/notifications",
    icon: <BellIcon />,
    minRole: "patient",
  },
  {
    title: "Settings",
    url: "/clinic/settings",
    icon: <Settings2Icon />,
    minRole: "staff",
  },
]

export function WorkspaceSidebar({
  user,
  clinicName,
  role,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
  }
  clinicName: string
  role: ClinicRole
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => can(role, item.minRole ?? "patient"))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<a href="/clinic" />}
              className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/logo.png"
                  alt="My Clinic"
                  width={32}
                  height={32}
                  className="size-full object-contain"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{clinicName}</span>
                <span className="truncate text-xs capitalize">{role}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {items.map((item) => {
            const active =
              item.match === "exact"
                ? pathname === item.url
                : pathname.startsWith(`${item.url}/`) || pathname === item.url
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  render={<a href={item.url} />}
                  isActive={active}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}