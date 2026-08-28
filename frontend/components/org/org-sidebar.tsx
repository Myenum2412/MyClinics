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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
];

const NEO_SUBITEMS = [
  { title: "Command Center", url: "/orgmenu/rgb-neo", icon: <RadioIcon className="size-4" /> },
  { title: "Live Monitoring", url: "/orgmenu/rgb-neo/live", icon: <Activity className="size-4" /> },
  { title: "Clinics", url: "/orgmenu/rgb-neo/clinics", icon: <BuildingOfficeIcon className="size-4" /> },
  { title: "Incidents", url: "/orgmenu/rgb-neo/incidents", icon: <ListTodoIcon className="size-4" /> },
  { title: "Events", url: "/orgmenu/rgb-neo/events", icon: <ClipboardList className="size-4" /> },
  { title: "Performance", url: "/orgmenu/rgb-neo/performance", icon: <HeartPulseIcon className="size-4" /> },
  { title: "Security", url: "/orgmenu/rgb-neo/security", icon: <ShieldAlertIcon className="size-4" /> },
  { title: "Integrations", url: "/orgmenu/rgb-neo/integrations", icon: <NetworkIcon className="size-4" /> },
  { title: "AI Insights", url: "/orgmenu/rgb-neo/ai", icon: <SparklesIcon className="size-4" /> },
  { title: "Predictions", url: "/orgmenu/rgb-neo/predictions", icon: <TrendingUpIcon className="size-4" /> },
  { title: "Business Impact", url: "/orgmenu/rgb-neo/business-impact", icon: <BuildingLibrary className="size-4" /> },
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
  const isNeoActive = pathname.startsWith("/orgmenu/rgb-neo")
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
              RGB Neo
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<a href="/orgmenu/rgb-neo" />} isActive={isNeoActive} tooltip="RGB Neo">
                  <RadioIcon className="size-4" />
                  <span>Command Center</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {NEO_SUBITEMS.filter((s) => s.url !== "/orgmenu/rgb-neo").map((sub) => {
                    const active = pathname.startsWith(sub.url)
                    return (
                      <SidebarMenuSubItem key={sub.url}>
                        <SidebarMenuSubButton render={<a href={sub.url} />} isActive={active}>
                          {sub.icon}
                          <span>{sub.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              </SidebarMenuItem>
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
