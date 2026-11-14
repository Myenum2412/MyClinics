"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import type { ClinicRole } from "@/lib/clinic-api"
import { getClinicSettings } from "@/lib/clinic-api"

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  CalendarDaysIcon,
  Squares2X2Icon as LayoutDashboardIcon,
  BeakerIcon as PillIcon,
  ReceiptPercentIcon as ReceiptTextIcon,
  Cog6ToothIcon as Settings2Icon,
  IdentificationIcon as StethoscopeIcon,
  UsersIcon,
  ClipboardDocumentListIcon as ClipboardListIcon,
  MegaphoneIcon,
  InboxIcon,
  ClipboardDocumentCheckIcon as RecordsIcon,
  FolderOpenIcon,
  ChartBarIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { HeartPulse } from "lucide-react";
import { FlaskConical } from "lucide-react";

interface NavItem {
  title: string
  url: string
  icon?: React.ReactNode
  match?: "exact" | "prefix"
  roles: ClinicRole[]
  children?: { title: string; url: string; match?: "exact" | "prefix"; roles?: ClinicRole[] }[]
}

type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Navigation",
    items: [
      { title: "Dashboard", url: "/clinic", icon: <LayoutDashboardIcon className="size-5" />, match: "exact", roles: ["patient", "doctor", "staff", "clinic_admin"] },
    ],
  },
  {
    label: "Clinical",
    items: [
      { title: "Patients", url: "/clinic/patients", icon: <UsersIcon className="size-5" />, roles: ["doctor", "staff", "clinic_admin"] },
      { title: "Examination", url: "/clinic/examination", icon: <ClipboardListIcon className="size-5" />, roles: ["patient", "doctor", "staff", "clinic_admin", "lab_technician"] },
      { title: "Teeth Chart", url: "/clinic/investigation", icon: <MagnifyingGlassIcon className="size-5" />, roles: ["patient", "doctor", "staff", "clinic_admin", "lab_technician"] },
      { title: "Medical Records", url: "/clinic/medical-record", icon: <FolderOpenIcon className="size-5" />, roles: ["patient", "doctor", "staff", "clinic_admin"] },
      { title: "Treatment", url: "/clinic/complaints", icon: <HeartPulse className="size-5" />, roles: ["doctor", "staff", "clinic_admin"] },
      { title: "Prescriptions", url: "/clinic/prescriptions", icon: <PillIcon className="size-5" />, roles: ["patient", "doctor", "staff", "clinic_admin"] },
      { title: "Appointments", url: "/clinic/appointments", icon: <CalendarDaysIcon className="size-5" />, match: "prefix", roles: ["patient", "doctor", "staff", "clinic_admin"] },
      { title: "Medicine", url: "/clinic/records", icon: <RecordsIcon className="size-5" />, roles: ["patient", "doctor", "staff", "clinic_admin"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Billing", url: "/clinic/billing", icon: <ReceiptTextIcon className="size-5" />, roles: ["patient", "doctor", "staff", "clinic_admin"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Reports", url: "/clinic/reports", icon: <ChartBarIcon className="size-5" />, roles: ["staff", "clinic_admin"] },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Announcement", url: "/clinic/notifications", icon: <MegaphoneIcon className="size-5" />, roles: ["doctor", "staff", "clinic_admin"] },
      { title: "AI Assistant", url: "/clinic/ai-assistant", icon: <Image src="/aidps.png" alt="AI" width={20} height={20} className="size-5 rounded-full object-cover" />, roles: ["patient", "doctor", "staff", "clinic_admin"] },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Doctors", url: "/clinic/doctors", icon: <StethoscopeIcon className="size-5" />, roles: ["doctor", "staff", "clinic_admin"] },
      { title: "Labs", url: "/clinic/labs", icon: <FlaskConical className="size-5" />, roles: ["clinic_admin"] },
      { title: "Contacts", url: "/clinic/crm/contacts", icon: <InboxIcon className="size-5" />, roles: ["staff", "clinic_admin"] },
      { title: "Audit Logs", url: "/clinic/audit-logs", icon: <ClipboardListIcon className="size-5" />, roles: ["clinic_admin"] },
      { title: "Settings", url: "/clinic/settings", icon: <Settings2Icon className="size-5" />, roles: ["staff", "clinic_admin"] },
    ],
  },
]

export function WorkspaceSidebar({
  user,
  clinicName,
  role,
  clinicId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
  }
  clinicName: string
  role: ClinicRole
  clinicId: string
}) {
  const pathname = usePathname()
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({})
  const [teethChartEnabled, setTeethChartEnabled] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    if (!clinicId) return
    let active = true
    getClinicSettings(clinicId)
      .then((settings) => {
        if (active) setTeethChartEnabled(settings.teethChartEnabled ?? false)
      })
      .catch(() => {
        if (active) setTeethChartEnabled(false)
      })
    return () => {
      active = false
    }
  }, [clinicId])

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
            {role !== "clinic_admin" && (
              <span className="truncate text-xs font-medium leading-tight text-muted-foreground capitalize">
                {role.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((i) => {
            if (!i.roles.includes(role)) return false
            if (i.url === "/clinic/investigation" && teethChartEnabled !== true) return false
            return true
          })
          if (visible.length === 0) return null
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="mb-0.5 px-3 text-[11px] font-semibold uppercase tracking-wider">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu>
                {visible.map((item) => {
              const url = item.url === "/clinic/medical-record" && role === "patient"
                ? "/clinic/patient/medical-records"
                : item.url;
              const active =
                item.match === "exact"
                  ? pathname === url
                  : pathname.startsWith(`${url}/`) || pathname === url
              const childActive =
                item.children?.some((c) =>
                  c.match === "exact"
                    ? pathname === c.url
                    : pathname.startsWith(`${c.url}/`) || pathname === c.url
                ) ?? false
              if (item.children) {
                const isOpen = openMap[item.url] ?? childActive
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      size="lg"
                      tooltip={item.title}
                      render={
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMap((m) => ({ ...m, [item.url]: !isOpen }))
                          }
                        />
                      }
                      data-active={active || childActive}
                      aria-expanded={isOpen}
                      className="h-11 rounded-lg text-[13.5px] font-medium group-data-[collapsible=icon]:h-12! data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-accent-foreground"
                    >
                      {item.icon}
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      <ChevronRightIcon
                        className={`ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                    </SidebarMenuButton>
                    {isOpen && (
                       <SidebarMenuSub>
                         {item.children
                           .filter((c) => !c.roles || c.roles.includes(role))
                           .map((c) => {
                          const ca =
                            c.match === "exact"
                              ? pathname === c.url
                              : pathname.startsWith(`${c.url}/`) || pathname === c.url
                          return (
                            <SidebarMenuSubItem key={c.url}>
                              <SidebarMenuSubButton
                                isActive={ca}
                                render={<a href={c.url} />}
                                className="text-[13px]"
                              >
                                <span>{c.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                )
              }
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={item.title}
                    render={<a href={url} />}
                    data-active={active}
                    className="h-11 rounded-lg text-[13.5px] font-medium group-data-[collapsible=icon]:h-12! data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-accent-foreground"
                  >
                    {item.icon}
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
                })}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} clinicId={clinicId} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
