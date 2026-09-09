import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

const NAV = [
  { label: "Quickstart", href: "/docs" },
  { label: "Dashboard", href: "/docs/dashboard" },
  { label: "Appointments", href: "/docs/appointments" },
  { label: "Patients", href: "/docs/patients" },
  { label: "Medical Records", href: "/docs/medical-records" },
  { label: "Treatment", href: "/docs/treatment" },
  { label: "Prescriptions", href: "/docs/prescriptions" },
  { label: "Medicine", href: "/docs/medicine" },
  { label: "Pharmacy — Inventory", href: "/docs/pharmacy/inventory" },
  { label: "Pharmacy — Stock History", href: "/docs/pharmacy/stock-history" },
  { label: "Pharmacy — Purchases", href: "/docs/pharmacy/purchases" },
  { label: "Pharmacy — Sales", href: "/docs/pharmacy/sales" },
  { label: "Pharmacy — Suppliers", href: "/docs/pharmacy/suppliers" },
  { label: "Billing", href: "/docs/billing" },
  { label: "Reports", href: "/docs/reports" },
  { label: "Notifications", href: "/docs/notifications" },
  { label: "AI Assistant", href: "/docs/ai-assistant" },
  { label: "Doctors", href: "/docs/doctors" },
  { label: "Leads", href: "/docs/leads" },
  { label: "Audit Logs", href: "/docs/audit-logs" },
  { label: "Settings", href: "/docs/settings" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden w-64 shrink-0 border-r bg-muted/20 p-6 md:block">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Documentation</p>
          <nav className="mt-4 flex flex-col gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
