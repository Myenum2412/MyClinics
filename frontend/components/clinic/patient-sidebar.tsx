"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays,
  ChevronDown,
  CircleUser,
  FileText,
  Folder,
  Home,
  ReceiptText,
} from "lucide-react";

const NAV_ITEMS = [
  { title: "Home", url: "/clinic/patient", icon: <Home className="size-5" />, match: "exact" as const },
  { title: "Appointments", url: "/clinic/patient/appointments", icon: <CalendarDays className="size-5" /> },
  { title: "Prescriptions", url: "/clinic/patient/prescriptions", icon: <FileText className="size-5" /> },
  { title: "Medical Records", url: "/clinic/patient/medical-records", icon: <Folder className="size-5" /> },
  { title: "Bills & Invoices", url: "/clinic/patient/billing", icon: <ReceiptText className="size-5" /> },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PatientSidebar({
  user,
  clinicName,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string };
  clinicName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  const go = (href: string) => {
    if (isMobile) setOpenMobile(false);
    router.push(href);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-100 bg-white"
      {...props}
    >
      <SidebarHeader className="h-16 shrink-0 justify-center border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-slate-200 shadow-sm">
            <Image
              src="/logo.png"
              alt="My Clinic Logo"
              width={36}
              height={36}
              className="size-9 object-contain"
            />
          </div>
          <div className="grid min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[15px] font-semibold leading-tight tracking-tight text-slate-900">
              {clinicName}
            </span>
            <span className="truncate text-xs font-medium leading-tight text-slate-500">
              Patient Portal
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            const active =
              item.match === "exact"
                ? pathname === item.url
                : pathname.startsWith(`${item.url}/`) || pathname === item.url;
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  size="lg"
                  tooltip={item.title}
                  render={<a href={item.url} />}
                  data-active={active}
                  className="relative h-11 rounded-lg text-[13.5px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 group-data-[collapsible=icon]:h-12! data-[active=true]:bg-blue-50 data-[active=true]:text-blue-600 data-[active=true]:[&>svg]:text-blue-600 data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-5 data-[active=true]:before:w-[3px] data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-blue-600"
                >
                  {item.icon}
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 bg-white p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Open profile menu"
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
              />
            }
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-blue-100 text-sm font-bold text-blue-700">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-blue-600">View Profile</p>
            </div>
            <ChevronDown className="size-4 shrink-0 text-slate-400 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="size-8">
                <AvatarFallback className="bg-blue-100 text-xs font-bold text-blue-700">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go("/clinic/profile")}>
              <CircleUser className="size-4" />
              View Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}