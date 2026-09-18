"use client";
import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { TeamSwitcher } from "@/components/team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, ChevronDown, CircleUser, FileText, Folder, Home, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PatientSidebar({ user, clinicName, ...props }: React.ComponentProps<typeof Sidebar> & { user: { name: string; email: string }; clinicName: string; }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const go = (href: string) => { if (isMobile) setOpenMobile(false); router.push(href); };
  const teams = [{ name: clinicName, logo: <Image src="/logo.png" alt={clinicName} width={32} height={32} className="size-full object-contain" />, plan: "Patient Portal" }]
  const navMain = [
    { title: "Home", url: "/clinic/patient", icon: <Home className="size-4" />, isActive: pathname === "/clinic/patient" },
    { title: "Appointments", url: "/clinic/patient/appointments", icon: <CalendarDays className="size-4" />, isActive: pathname.startsWith("/clinic/patient/appointments") },
    { title: "Prescriptions", url: "/clinic/patient/prescriptions", icon: <FileText className="size-4" />, isActive: pathname.startsWith("/clinic/patient/prescriptions") },
    { title: "Medical Records", url: "/clinic/patient/medical-records", icon: <Folder className="size-4" />, isActive: pathname.startsWith("/clinic/patient/medical-records") },
    { title: "Bills & Invoices", url: "/clinic/patient/billing", icon: <ReceiptText className="size-4" />, isActive: pathname.startsWith("/clinic/patient/billing") },
    { title: "AI Assistant", url: "/clinic/ai-assistant", icon: <Image src="/aidps.png" alt="AI" width={20} height={20} className="size-4 rounded-full object-cover" />, isActive: pathname.startsWith("/clinic/ai-assistant") },
  ]
  const projects = navMain.slice(0,3).map(i => ({ name: i.title, url: i.url, icon: i.icon }))
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader><TeamSwitcher teams={teams} /></SidebarHeader>
      <SidebarContent><NavMain items={navMain} /><NavProjects projects={projects} /></SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" aria-label="Open profile menu" className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent" />} >
            <Avatar className="size-9"><AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{initials(user.name)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.name}</p>
              <p className="truncate text-xs text-primary">View Profile</p>
            </div>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" side={isMobile ? "bottom" : "right"} align="end" sideOffset={6}>
            <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{initials(user.name)}</AvatarFallback></Avatar>
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go("/clinic/patient/profile")}><CircleUser className="size-4" />View Profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
