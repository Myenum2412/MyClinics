"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, ChevronDown } from "lucide-react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  clinic_admin: "Clinic Admin",
  doctor: "Doctor",
  staff: "Staff",
  patient: "Patient",
};

export default function ClinicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useRequireRole("patient");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
        <Link href="/clinic" className="flex items-center gap-2.5">
          <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border shadow-sm">
            <Image
              src="/logo.png"
              alt="MyClinic Logo"
              width={36}
              height={36}
              className="size-9 object-contain"
            />
          </div>
          <div className="grid">
            <span className="text-[15px] font-semibold leading-tight tracking-tight">
              MyClinic
            </span>
            <span className="truncate text-xs font-medium leading-tight text-muted-foreground">
              Clinic Management
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/clinic/notifications"
            aria-label="Notifications"
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-4" />
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            {session?.clinicId ? (
              <PersonAvatar
                clinicId={session.clinicId}
                ownerType="clinic"
                ownerId={session.clinicId}
                name={session.name ?? "User"}
                size="sm"
                className="size-9"
              />
            ) : (
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(session?.name ?? "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="hidden grid text-right sm:block">
              <span className="block max-w-40 truncate text-sm font-medium leading-tight">
                {session?.name ?? "User"}
              </span>
              <span className="block text-xs leading-tight text-muted-foreground capitalize">
                {ROLE_LABELS[session?.role ?? ""] ?? "Clinic"}
              </span>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}