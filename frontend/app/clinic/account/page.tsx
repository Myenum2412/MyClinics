"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftEndOnRectangleIcon,
  BellIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import type { ClinicRole, Notification, WhatsappSession } from "@/lib/clinic-api";
import {
  getWhatsappSession,
  listAppointments,
  listDoctors,
  listNotifications,
  listPatients,
  listStaff,
} from "@/lib/clinic-api";
import { ClinicProfile } from "@/components/clinic/clinic-profile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const NOTIFICATION_ICON: Record<Notification["type"], typeof BellIcon> = {
  appointment: CalendarDaysIcon,
  bill: CheckBadgeIcon,
  report: BellIcon,
  prescription: BellIcon,
  general: BellIcon,
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs text-gray-800">{value}</span>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: number | null;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight text-gray-800">
          {loading ? <Skeleton className="h-6 w-8" /> : value === null ? "—" : value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const canEdit = sessionCan(session, "clinic_admin");
  const router = useRouter();

  const [stats, setStats] = useState<Record<string, number | null>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [waSession, setWaSession] = useState<WhatsappSession | null>(null);

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    if (!clinicId) return;
    const jobs: [string, Promise<{ total: number }>][] = [
      ["patients", listPatients(clinicId, { limit: 1 })],
      ["doctors", listDoctors(clinicId, { limit: 1 })],
      ["staff", listStaff(clinicId, { limit: 1 })],
      ["appointments", listAppointments(clinicId, { limit: 1 })],
    ];
    Promise.allSettled(
      jobs.map(async ([key, promise]) => {
        try {
          const res = await promise;
          return [key, res.total] as const;
        } catch {
          return [key, null] as const;
        }
      })
    ).then((results) => {
      const next: Record<string, number | null> = {};
      for (const r of results) {
        if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
      }
      setStats(next);
      setStatsLoading(false);
    });
    listNotifications(clinicId, { limit: 5 })
      .then((res) => {
        setNotifications(res.items);
        setUnread(res.unread);
      })
      .catch(() => {});
    getWhatsappSession()
      .then(setWaSession)
      .catch(() => setWaSession(null));
  }, [clinicId]);

  const role = session?.role ?? "staff";
  const initials = (session?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const waConnected = waSession?.state?.connected === true;
  const waStage = waSession?.state?.stage ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your profile, clinic overview and session details
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
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

      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-700">Clinic at a glance</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            icon={UsersIcon}
            label="Patients"
            value={stats.patients ?? null}
            loading={statsLoading}
          />
          <StatTile
            icon={ClipboardDocumentListIcon}
            label="Doctors"
            value={stats.doctors ?? null}
            loading={statsLoading}
          />
          <StatTile
            icon={UserGroupIcon}
            label="Staff"
            value={stats.staff ?? null}
            loading={statsLoading}
          />
          <StatTile
            icon={CalendarDaysIcon}
            label="Appointments"
            value={stats.appointments ?? null}
            loading={statsLoading}
          />
        </div>
      </div>

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
              <CardTitle>WhatsApp connection</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {waSession === null ? (
                <p className="text-sm text-muted-foreground">Checking status…</p>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`size-2.5 rounded-full ${
                      waConnected ? "bg-green-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="font-medium text-gray-800">
                    {waConnected ? "Connected" : waStage ?? "Unavailable"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {waSession.state?.updatedAt
                      ? `· updated ${new Date(waSession.state.updatedAt).toLocaleTimeString("en-IN")}`
                      : ""}
                  </span>
                </div>
              )}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent notifications</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/clinic/notifications")}>
            {unread > 0 && (
              <Badge variant="destructive" className="mr-1">
                {unread}
              </Badge>
            )}
            View all
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {notifications.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const Icon = NOTIFICATION_ICON[n.type];
                return (
                  <li key={n.notificationId} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                        n.readAt ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{n.title}</p>
                      {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-1">
        <ClinicProfile clinicId={clinicId} canEdit={canEdit} />
      </div>
    </div>
  );
}