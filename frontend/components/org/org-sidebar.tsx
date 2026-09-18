"use client";

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  BuildingOffice2Icon as BuildingOfficeIcon,
  BuildingLibraryIcon as BuildingLibrary,
  ChatBubbleLeftRightIcon as ChatBubbleIcon,
} from "@heroicons/react/24/outline";

import {
  RadioIcon,
  ListTodoIcon,
  Activity,
  ClipboardList,
  HeartPulseIcon,
  SparklesIcon,
  TrendingUpIcon,
  ShieldAlertIcon,
  NetworkIcon,
  FileText,
} from "lucide-react";

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
  {
    title: "WhatsApp Messages",
    url: "/orgmenu/whatsapp",
    icon: <ChatBubbleIcon />,
    match: "prefix" as const,
  },
  {
    title: "Assistant Soul",
    url: "/orgmenu/soul",
    icon: <FileText className="size-4" />,
    match: "prefix" as const,
  },
];

const NEO_SUBITEMS = [
  { title: "Traceway Dashboard", url: "/orgmenu/traceway", icon: <RadioIcon className="size-4" /> },
  { title: "Traces", url: "/orgmenu/traceway/traces", icon: <Activity className="size-4" /> },
  { title: "Logs", url: "/orgmenu/traceway/logs", icon: <ClipboardList className="size-4" /> },
  { title: "Metrics", url: "/orgmenu/traceway/metrics", icon: <HeartPulseIcon className="size-4" /> },
  { title: "Exceptions", url: "/orgmenu/traceway/exceptions", icon: <ShieldAlertIcon className="size-4" /> },
  { title: "Session Replay", url: "/orgmenu/traceway/replay", icon: <ListTodoIcon className="size-4" /> },
  { title: "AI Tracing", url: "/orgmenu/traceway/ai", icon: <SparklesIcon className="size-4" /> },
  { title: "Endpoints", url: "/orgmenu/traceway/endpoints", icon: <NetworkIcon className="size-4" /> },
  { title: "Alerts", url: "/orgmenu/traceway/alerts", icon: <TrendingUpIcon className="size-4" /> },
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
        <SidebarGroup>
          <SidebarGroupContent>
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
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="flex items-center gap-2">
              <RadioIcon className="size-4 text-primary" />
              Traceway
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NEO_SUBITEMS.map((item) => {
                const active =
                  item.url === "/orgmenu/traceway"
                    ? pathname === item.url
                    : pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton render={<a href={item.url} />} isActive={active} tooltip={item.title}>
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
