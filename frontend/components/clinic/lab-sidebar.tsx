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
  Squares2X2Icon as LayoutDashboardIcon,
  DocumentChartBarIcon as ReportsIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  title: string
  url: string
  icon?: React.ReactNode
  match?: "exact" | "prefix"
}

/**
 * Lab workspace sidebar — a dedicated navigation for the `lab_technician`
 * role. Lab accounts are created from `/clinic/labs` (which provisions a
 * `lab_technician` user) and sign in through the common `/login` page.
 *
 * Only the lab's own modules are listed here: the dashboard and the lab
 * reports list. Every report view is scoped server-side to the caller's
 * clinic (see InvestigationRepository).
 */
const LAB_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "/clinic/lab",
    icon: <LayoutDashboardIcon className="size-6" />,
    match: "exact",
  },
  {
    title: "Lab Reports",
    url: "/clinic/lab/reports",
    icon: <ReportsIcon className="size-6" />,
    match: "prefix",
  },
]

export function LabSidebar({
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
            <span className="truncate text-xs font-medium leading-tight text-muted-foreground">
              Lab Workspace
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
            {LAB_NAV_ITEMS.map((item) => {
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
