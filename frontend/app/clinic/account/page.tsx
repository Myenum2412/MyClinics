"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftEndOnRectangleIcon } from "@heroicons/react/24/outline";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import type { ClinicRole } from "@/lib/clinic-api";
import { ClinicProfile } from "@/components/clinic/clinic-profile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/lib/clinic-api";

const ROLE_LABELS: Record<ClinicRole, string> = {
  platform_admin: "Platform Admin",
  clinic_admin: "Clinic Admin",
  doctor: "Doctor",
  staff: "Staff",
  patient: "Patient",
};

const ROLE_BADGE: Record<ClinicRole, string> = {
  platform_admin: "bg-purple-100 text-purple-700 border-purple-200",
  clinic_admin: "bg-blue-100 text-blue-700 border-blue-200",
  doctor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  staff: "bg-amber-100 text-amber-700 border-amber-200",
  patient: "bg-gray-100 text-gray-700 border-gray-200",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs text-gray-800">{value}</span>
    </div>
  );
}

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const canEdit = sessionCan(session, "clinic_admin");
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  const role = session?.role ?? "staff";
  const initials = (session?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your profile, clinic information and session details
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-gray-800">
                  {session?.name ?? "Unknown user"}
                </p>
                <Badge variant="outline" className={ROLE_BADGE[role]}>
                  {ROLE_LABELS[role]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{session?.email ?? "—"}</p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleLogout} className="shrink-0">
            <ArrowLeftEndOnRectangleIcon className="size-4" />
            Log out
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DetailRow label="User ID" value={session?.userId ?? "—"} />
            <Separator />
            <DetailRow label="Role" value={ROLE_LABELS[role]} />
            <Separator />
            <DetailRow label="Clinic ID" value={clinicId || "—"} />
            <Separator />
            <DetailRow label="Doctor ID" value={session?.doctorId ?? "—"} />
            <Separator />
            <DetailRow label="Patient ID" value={session?.patientId ?? "—"} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                {canEdit
                  ? "You can manage clinic settings, staff and data."
                  : "You have read and limited edit access to this clinic."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-3 text-sm text-muted-foreground">
                Sign out of this clinic workspace on this device.
              </p>
              <Button variant="outline" onClick={handleLogout}>
                <ArrowLeftEndOnRectangleIcon className="size-4" />
                Log out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <ClinicProfile clinicId={clinicId} canEdit={canEdit} />
      </div>
    </div>
  );
}