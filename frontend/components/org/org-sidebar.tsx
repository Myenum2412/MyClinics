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
  ClipboardList,
  FileText,
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
      isActive: pathname.startsWith("/orgmenu") && !pathname.startsWith("/orgmenu/whatsapp") && !pathname.startsWith("/orgmenu/soul") && !pathname.startsWith("/orgmenu/faq"),
      items: [
        { title: "All Clinics", url: "/orgmenu" },
        { title: "Organization", url: "/orgmenu/organization" },
      ],
    },
    {
      title: "Communication",
      url: "#",
      icon: <ChatBubbleIcon className="size-4" />,
      isActive: pathname.startsWith("/orgmenu/whatsapp") || pathname.startsWith("/orgmenu/soul") || pathname.startsWith("/orgmenu/faq"),
      items: [
        { title: "WhatsApp Messages", url: "/orgmenu/whatsapp" },
        { title: "Assistant Soul", url: "/orgmenu/soul" },
        { title: "F&Q Inquiries", url: "/orgmenu/faq" },
      ],
    },
  ]

  const projects = [
    { name: "F&Q Inquiries", url: "/orgmenu/faq", icon: <ClipboardList className="size-4" /> },
    { name: "WhatsApp", url: "/orgmenu/whatsapp", icon: <ChatBubbleIcon className="size-4" /> },
    { name: "Soul", url: "/orgmenu/soul", icon: <FileText className="size-4" /> },
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
