"use client";

import * as React from "react";
import Image from "next/image";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  CalendarDaysIcon,
  DocumentTextIcon as FileText,
  HomeIcon,
  BeakerIcon as Pill,
  ReceiptPercentIcon as ReceiptText,
  IdentificationIcon as Stethoscope,
} from "@heroicons/react/24/outline";

const data: {
  navMain: {
    title: string
    url: string
    icon?: React.ReactNode
    match?: "exact" | "prefix"
  }[]
} = {
  navMain: [
    {
      title: "Dashboard",
      url: "/patient",
      icon: <HomeIcon />,
      match: "exact",
    },
    {
      title: "My Appointments",
      url: "/patient/appointments",
      icon: <CalendarDaysIcon />,
    },
    {
      title: "Medical Reports",
      url: "/patient/reports",
      icon: <FileText />,
    },
    {
      title: "My Bills",
      url: "/patient/billing",
      icon: <ReceiptText />,
    },
    {
      title: "Medicines",
      url: "/patient/medicines",
      icon: <Pill />,
    },
    {
      title: "My Doctors",
      url: "/patient/doctors",
      icon: <Stethoscope />,
    },
  ],
};

export function PatientSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: string;
  };
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<a href="/patient" />}
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
                  {user.role ?? "Patient"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
