"use client"

import * as React from "react"
import Image from "next/image"

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
  LayoutDashboardIcon,
  CalendarDaysIcon,
  UsersIcon,
  StethoscopeIcon,
  PillIcon,
  TabletsIcon,
  FileTextIcon,
  ReceiptTextIcon,
  Settings2Icon,
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/doctor",
      icon: <LayoutDashboardIcon />,
      isActive: true,
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
    },
    {
      title: "Medicines",
      url: "/doctor/medicines",
      icon: <TabletsIcon />,
    },
    {
      title: "Medical Reports",
      url: "/doctor/reports",
      icon: <FileTextIcon />,
    },
    {
      title: "Billing",
      url: "/doctor/billing",
      icon: <ReceiptTextIcon />,
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
            <SidebarMenuButton render={<a href="/doctor/settings" />}>
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

