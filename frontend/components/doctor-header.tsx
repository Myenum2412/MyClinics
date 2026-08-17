"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const PAGE_TITLES: Record<string, string> = {
  "/doctor": "Dashboard",
  "/doctor/appointments": "Appointments",
  "/doctor/patients": "Patients",
  "/doctor/patients/new": "Add Patient",
  "/doctor/doctors": "Doctors",
  "/doctor/prescriptions": "Prescriptions",
  "/doctor/prescriptions/new": "Add Prescription",
  "/doctor/medicines": "Medicines",
  "/doctor/medicines/new": "Add Medicine",
  "/doctor/reports": "Medical Reports",
  "/doctor/reports/new": "Add Report",
  "/doctor/billing": "Billing",
  "/doctor/billing/new": "Add Bill",
  "/doctor/settings": "Settings",
  "/doctor/profile": "Profile",
  "/patient": "Dashboard",
  "/patient/appointments": "My Appointments",
  "/patient/reports": "Medical Reports",
  "/patient/billing": "My Bills",
  "/patient/medicines": "Medicines",
  "/patient/doctors": "My Doctors",
}

function pageTitleFor(pathname: string): string {
  const exact = PAGE_TITLES[pathname]
  if (exact) return exact
  if (pathname.endsWith("/edit")) {
    const parent = PAGE_TITLES[pathname.slice(0, -"/edit".length)]
    if (parent) return `Edit ${parent}`
    const sections = Object.entries(PAGE_TITLES)
      .filter(([path]) => path !== "/doctor" && path !== "/patient")
      .sort((a, b) => b[0].length - a[0].length)
    for (const [path, title] of sections) {
      if (pathname.startsWith(path)) return `Edit ${title}`
    }
    return "Edit"
  }
  const segment = pathname.split("/").filter(Boolean).pop() ?? ""
  const words = segment.replace(/[-_]/g, " ").trim()
  return words
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : "Dashboard"
}

export function DoctorHeader({ clinicName }: { clinicName: string }) {
  const pathname = usePathname()
  const home = pathname.startsWith("/patient") ? "/patient" : "/doctor"

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={home}>{clinicName}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitleFor(pathname)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
