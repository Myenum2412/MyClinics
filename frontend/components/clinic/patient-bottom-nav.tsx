"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Folder,
  Home,
  ReceiptText,
  User,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchExact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/clinic/patient",
    icon: Home,
    matchExact: true,
  },
  {
    label: "Appointments",
    href: "/clinic/patient/appointments",
    icon: CalendarDays,
  },
  {
    label: "Records",
    href: "/clinic/patient/medical-records",
    icon: Folder,
  },
  {
    label: "Bills",
    href: "/clinic/patient/billing",
    icon: ReceiptText,
  },
  {
    label: "Profile",
    href: "/clinic/patient/profile",
    icon: User,
  },
];

export function PatientBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block border-t border-purple-100/80 bg-white/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(139,92,246,0.08)] md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchExact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center py-1 transition-all group focus:outline-none min-h-[44px]"
            >
              {isActive ? (
                <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-1.5 text-indigo-600 shadow-2xs transition-all ring-1 ring-indigo-100">
                  <Icon className="size-5 text-indigo-600 stroke-[2.2]" />
                  <span className="text-[11px] font-bold tracking-tight text-indigo-700">
                    {item.label}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 px-2 py-1 text-slate-400 group-hover:text-slate-600 transition-colors">
                  <Icon className="size-5 stroke-[1.8]" />
                  <span className="text-[11px] font-medium text-slate-500">
                    {item.label}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
