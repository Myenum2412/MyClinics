"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

const PAGE_TITLES: Record<string, string> = {
  "/clinic": "Dashboard",
  "/clinic/appointments": "Appointments",
  "/clinic/patients": "Patients",
  "/clinic/doctors": "Doctors",
  "/clinic/staff": "Staff",
  "/clinic/records": "Medicine",
  "/clinic/prescriptions": "Prescriptions",
  "/clinic/billing": "Billing",
  "/clinic/audit-logs": "Audit Logs",
  "/clinic/notifications": "Notifications",
  "/clinic/settings": "Settings",
}

function pageTitleFor(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const segment = pathname.split("/").filter(Boolean).pop() ?? ""
  const words = segment.replace(/[-_]/g, " ").trim()
  return words
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : "Dashboard"
}

export function WorkspaceHeader() {
  const pathname = usePathname()
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbPage className="capitalize">
              {pageTitleFor(pathname)}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}