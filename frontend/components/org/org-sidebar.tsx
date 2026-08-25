"use client";

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

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
  BuildingOffice2Icon as BuildingOfficeIcon,
  BuildingLibraryIcon as BuildingLibrary,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  {
    title: "All Clinics",
    url: "/orgmenu",
    icon: <BuildingOfficeIcon />,
    match: "exact" as const,
  },
  {
    title: "Organization",
    url: "/orgmenu/organization",
    icon: <BuildingLibrary />,
    match: "prefix" as const,
  },
];

export function OrgSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
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
              render={<a href="/orgmenu" />}
              className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/logo.png"
                  alt="My Clinics"
                  width={32}
                  height={32}
                  className="size-full object-contain"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">My Clinics</span>
                <span className="truncate text-xs">Organization Menu</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            const active =
              item.match === "exact" ? pathname === item.url : pathname.startsWith(`${item.url}`)
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton render={<a href={item.url} />} isActive={active}>
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
