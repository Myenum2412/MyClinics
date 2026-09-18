"use client";

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
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
  GalleryVerticalEndIcon,
} from "lucide-react";

export function OrgSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string }
}) {
  const pathname = usePathname()

  const teams = [
    {
      name: "My Clinics",
      logo: (
        <Image src="/logo.png" alt="My Clinics" width={32} height={32} className="size-full object-contain" />
      ),
      plan: "Organization",
    },
  ]

  const navMain = [
    {
      title: "Clinics",
      url: "#",
      icon: <BuildingOfficeIcon className="size-4" />,
      isActive: pathname.startsWith("/orgmenu") && !pathname.startsWith("/orgmenu/traceway") && !pathname.startsWith("/orgmenu/whatsapp") && !pathname.startsWith("/orgmenu/soul"),
      items: [
        { title: "All Clinics", url: "/orgmenu" },
        { title: "Organization", url: "/orgmenu/organization" },
      ],
    },
    {
      title: "Communication",
      url: "#",
      icon: <ChatBubbleIcon className="size-4" />,
      isActive: pathname.startsWith("/orgmenu/whatsapp") || pathname.startsWith("/orgmenu/soul"),
      items: [
        { title: "WhatsApp Messages", url: "/orgmenu/whatsapp" },
        { title: "Assistant Soul", url: "/orgmenu/soul" },
      ],
    },
    {
      title: "Traceway",
      url: "#",
      icon: <RadioIcon className="size-4" />,
      isActive: pathname.startsWith("/orgmenu/traceway"),
      items: [
        { title: "Dashboard", url: "/orgmenu/traceway" },
        { title: "Traces", url: "/orgmenu/traceway/traces" },
        { title: "Logs", url: "/orgmenu/traceway/logs" },
        { title: "Metrics", url: "/orgmenu/traceway/metrics" },
        { title: "Exceptions", url: "/orgmenu/traceway/exceptions" },
        { title: "Session Replay", url: "/orgmenu/traceway/replay" },
        { title: "AI Tracing", url: "/orgmenu/traceway/ai" },
        { title: "Endpoints", url: "/orgmenu/traceway/endpoints" },
        { title: "Alerts", url: "/orgmenu/traceway/alerts" },
      ],
    },
  ]

  const projects = [
    { name: "WhatsApp", url: "/orgmenu/whatsapp", icon: <ChatBubbleIcon className="size-4" /> },
    { name: "Soul", url: "/orgmenu/soul", icon: <FileText className="size-4" /> },
    { name: "Traceway", url: "/orgmenu/traceway", icon: <RadioIcon className="size-4" /> },
  ]

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
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
