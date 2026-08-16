"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
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
  CircleStackIcon as TabletsIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const data: {
  navMain: {
    title: string
    url: string
    icon?: React.ReactNode
    match?: "exact" | "prefix"
    items?: {
      title: string
      url: string
    }[]
  }[]
} = {
  navMain: [
    {
      title: "Dashboard",
      url: "/doctor",
      icon: <LayoutDashboardIcon />,
      match: "exact",
    },
    {
      title: "Appointments",
      url: "/doctor/appointments",
      icon: <CalendarDaysIcon />,
    },
    {
      title: "Patients",
      url: "/doctor/patients",
      icon: <UsersIcon />,
      items: [
        { title: "All Patients", url: "/doctor/patients" },
        { title: "Add Patient", url: "/doctor/patients/new" },
      ],
    },
    {
      title: "Doctors",
      url: "/doctor/doctors",
      icon: <StethoscopeIcon />,
    },
    {
      title: "Prescriptions",
      url: "/doctor/prescriptions",
      icon: <PillIcon />,
      items: [
        { title: "All Prescriptions", url: "/doctor/prescriptions" },
        { title: "Add Prescription", url: "/doctor/prescriptions/new" },
      ],
    },
    {
      title: "Medicines",
      url: "/doctor/medicines",
      icon: <TabletsIcon />,
      items: [
        { title: "All Medicines", url: "/doctor/medicines" },
        { title: "Add Medicine", url: "/doctor/medicines/new" },
      ],
    },
    {
      title: "Medical Reports",
      url: "/doctor/reports",
      icon: <FileTextIcon />,
      items: [
        { title: "All Reports", url: "/doctor/reports" },
        { title: "Add Report", url: "/doctor/reports/new" },
      ],
    },
    {
      title: "Billing",
      url: "/doctor/billing",
      icon: <ReceiptTextIcon />,
      items: [
        { title: "All Bills", url: "/doctor/billing" },
        { title: "Add Bill", url: "/doctor/billing/new" },
      ],
    },
  ],
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    image?: string | null
    role?: string
  }
}) {
  const pathname = usePathname()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<a href="/doctor" />}
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
                <span className="truncate font-medium">My Clinic</span>
                <span className="truncate text-xs capitalize">
                  {user.role ?? "Doctor"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Staff" items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<a href="/doctor/settings" />}
              isActive={pathname === "/doctor/settings"}
            >
              <Settings2Icon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

