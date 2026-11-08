"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  type ClinicProfile,
  type ClinicStats,
  type Patient,
  type WeeklyScheduleDay,
  activateClinic,
  getAnyClinic,
  getClinicStats,
  listPatients,
  suspendClinic,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/datetime";
import {
  Building2,
  ClipboardList,
  Clock,
  Globe,
  Info,
  MapPin,
  Phone,
} from "lucide-react";

export default function OrgClinicDetailPage() {
  const session = useClinicSession();
  const { clinicId } = useParams<{ clinicId: string }>();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    getAnyClinic(clinicId)
      .then(setClinic)
      .catch(() => toast.error("Failed to load clinic"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const loadStats = useCallback(() => {
    if (!clinicId) return;
    getClinicStats(clinicId)
      .then(setStats)
      .catch(() => toast.error("Failed to load clinic stats"));
  }, [clinicId]);

  const loadPatients = useCallback(() => {
    if (!clinicId) return;
    setLoadingPatients(true);
    listPatients(clinicId, { limit: 100 })
      .then((res) => setPatients(res?.items ?? []))
      .catch(() => toast.error("Failed to load patients"))
      .finally(() => setLoadingPatients(false));
  }, [clinicId]);

  useEffect(() => {
    if (session.session) {
      load();
      loadStats();
      loadPatients();
    }
  }, [session.session, load, loadStats, loadPatients]);

  async function handleSuspend() {
    if (!clinic) return;
    if (!confirm(`Suspend ${clinic.name}? Its members will be blocked from login.`)) return;
    try {
      await suspendClinic(clinic.clinicId);
      toast.success("Clinic suspended");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to suspend clinic");
    }
  }

  async function handleActivate() {
    if (!clinic) return;
    try {
      await activateClinic(clinic.clinicId);
      toast.success("Clinic activated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate clinic");
    }
  }

  const statCards = stats
    ? [
        { label: "Doctors", value: stats.doctors },
        { label: "Staff", value: stats.staff },
        { label: "Patients", value: stats.patients },
        { label: "Appointments", value: stats.appointments },
        { label: "Medical Records", value: stats.medicalRecords },
        { label: "Prescriptions", value: stats.prescriptions },
        { label: "Bills", value: stats.bills },
        { label: "Users", value: stats.users },
      ]
    : [];

  const profile = clinic ? profileOf(clinic) : null;
  const weeklySchedule = clinic ? weeklyScheduleOf(clinic) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{loading ? "Loading..." : clinic?.name}</CardTitle>
              {clinic && (
                <p className="mt-1 font-mono text-xs text-muted-foreground">{clinic.clinicId}</p>
              )}
            </div>
            {clinic && (
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    clinic.status === "active"
                      ? "bg-success/10 text-success"
                      : clinic.status === "suspended"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  {clinic.status}
                </Badge>
                {clinic.status === "active" ? (
                  <Button variant="outline" size="sm" onClick={handleSuspend}>
                    Suspend
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleActivate}>
                    Activate
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading || !clinic ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <ProfileSection
                icon={<Building2 className="size-4 text-primary" />}
                title="Basic details"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <ProfileItem label="Clinic name">{clinic.name}</ProfileItem>
                  <ProfileItem label="Clinic type">{orDash(profile?.clinicType)}</ProfileItem>
                  <ProfileItem label="Registration number">
                    {orDash(profile?.registrationNumber)}
                  </ProfileItem>
                  <ProfileItem label="Established year">
                    {orDash(profile?.establishedYear)}
                  </ProfileItem>
                  <ProfileItem label="Slug">
                    <span className="font-mono text-xs break-all">{clinic.slug}</span>
                  </ProfileItem>
                  <ProfileItem label="Clinic ID">
                    <span className="font-mono text-xs break-all">{clinic.clinicId}</span>
                  </ProfileItem>
                  <ProfileItem label="Status">
                    <span className="capitalize">{clinic.status}</span>
                  </ProfileItem>
                  <ProfileItem label="Created">{formatDate(clinic.createdAt)}</ProfileItem>
                  <ProfileItem label="Last updated">
                    {formatDate(clinic.updatedAt)}
                  </ProfileItem>
                </div>
              </ProfileSection>

              <Separator />

              <ProfileSection
                icon={<Info className="size-4 text-primary" />}
                title="Clinic information"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileItem label="About clinic" className="sm:col-span-2">
                    <p className="whitespace-pre-wrap text-sm font-normal text-foreground/90">
                      {orDash(clinic.description)}
                    </p>
                  </ProfileItem>
                  <ProfileItem label="Specializations" className="sm:col-span-2">
                    <TagList items={profile?.specializations ?? []} />
                  </ProfileItem>
                  <ProfileItem label="Services offered" className="sm:col-span-2">
                    <TagList items={profile?.services ?? []} />
                  </ProfileItem>
                </div>
              </ProfileSection>

              <Separator />

              <ProfileSection
                icon={<Phone className="size-4 text-primary" />}
                title="Contact details"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ProfileItem label="Phone number">{orDash(clinic.phone)}</ProfileItem>
                  <ProfileItem label="WhatsApp number">
                    {orDash(profile?.whatsapp)}
                  </ProfileItem>
                  <ProfileItem label="Email address">{orDash(clinic.email)}</ProfileItem>
                  <ProfileItem label="Website">
                    {clinic.website ? (
                      <a
                        href={withProtocol(clinic.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        {clinic.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </ProfileItem>
                  <ProfileItem label="Emergency contact">
                    {orDash(profile?.emergencyContact)}
                  </ProfileItem>
                </div>
              </ProfileSection>

              <Separator />

              <ProfileSection
                icon={<MapPin className="size-4 text-primary" />}
                title="Clinic address"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ProfileItem
                    label="Address line 1"
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    {orDash(profile?.addressLine1)}
                  </ProfileItem>
                  <ProfileItem
                    label="Address line 2"
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    {orDash(profile?.addressLine2)}
                  </ProfileItem>
                  <ProfileItem label="City">{orDash(profile?.city)}</ProfileItem>
                  <ProfileItem label="State">{orDash(profile?.state)}</ProfileItem>
                  <ProfileItem label="Country">{orDash(profile?.country)}</ProfileItem>
                  <ProfileItem label="Pincode">{orDash(profile?.pincode)}</ProfileItem>
                  <ProfileItem
                    label="Address (summary)"
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    {orDash(clinic.address)}
                  </ProfileItem>
                </div>
              </ProfileSection>

              <Separator />

              <ProfileSection
                icon={<Clock className="size-4 text-primary" />}
                title="Working hours"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-2">
                    {weeklySchedule.map((day) => (
                      <div
                        key={day.day}
                        className="flex items-center justify-between gap-4 border-b border-border/60 py-1 text-sm last:border-0"
                      >
                        <span className="font-medium">{day.day}</span>
                        <span className="text-muted-foreground">
                          {day.closed
                            ? "Closed"
                            : `${formatTime12h(day.open)} – ${formatTime12h(day.close)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileItem label="Slot duration">
                      {clinic.settings.slotMinutes} min
                    </ProfileItem>
                    <ProfileItem label="Currency">
                      {orDash(clinic.settings.currency)}
                    </ProfileItem>
                    <ProfileItem label="Timezone">
                      {orDash(clinic.settings.timezone)}
                    </ProfileItem>
                    <ProfileItem label="Working days">
                      {orDash(clinic.settings.workingHours.days)}
                    </ProfileItem>
                  </div>
                </div>
              </ProfileSection>

              <Separator />

              <ProfileSection
                icon={<ClipboardList className="size-4 text-primary" />}
                title="Additional details"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileItem label="GST number">{orDash(profile?.gstNumber)}</ProfileItem>
                  <ProfileItem label="Tax / business ID">
                    {orDash(profile?.taxBusinessId)}
                  </ProfileItem>
                  <ProfileItem label="Social media" className="sm:col-span-2">
                    <SocialLinks social={profile?.socialMedia} />
                  </ProfileItem>
                </div>
              </ProfileSection>
            </div>
          )}
        </CardContent>
      </Card>

      {clinic && (
        <Card className="rounded-2xl border shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Integrations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              render={<Link href={`/orgmenu/clinics/${clinic.clinicId}/integrations/meta`} />}
            >
              Meta Business Integration
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-none border shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPatients ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : patients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              — No patients in this clinic yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow className="transition-colors duration-150 hover:bg-muted/40" key={p.patientId}>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell>{p.mobile}</TableCell>
                    <TableCell>{p.email ?? "—"}</TableCell>
                    <TableCell>{p.doctorId ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function profileOf(clinic: Clinic): ClinicProfile {
  const social = clinic.profile?.socialMedia;
  return {
    clinicType: clinic.profile?.clinicType ?? null,
    registrationNumber: clinic.profile?.registrationNumber ?? null,
    establishedYear: clinic.profile?.establishedYear ?? null,
    whatsapp: clinic.profile?.whatsapp ?? null,
    addressLine1: clinic.profile?.addressLine1 ?? null,
    addressLine2: clinic.profile?.addressLine2 ?? null,
    city: clinic.profile?.city ?? null,
    state: clinic.profile?.state ?? null,
    country: clinic.profile?.country ?? null,
    pincode: clinic.profile?.pincode ?? null,
    specializations: clinic.profile?.specializations ?? [],
    services: clinic.profile?.services ?? [],
    emergencyContact: clinic.profile?.emergencyContact ?? null,
    gstNumber: clinic.profile?.gstNumber ?? null,
    taxBusinessId: clinic.profile?.taxBusinessId ?? null,
    socialMedia: {
      facebook: social?.facebook ?? null,
      instagram: social?.instagram ?? null,
      twitter: social?.twitter ?? null,
      linkedin: social?.linkedin ?? null,
    },
  };
}

function weeklyScheduleOf(clinic: Clinic): WeeklyScheduleDay[] {
  if (clinic.settings.weeklySchedule?.length) {
    return clinic.settings.weeklySchedule;
  }
  const open = clinic.settings.workingHours.open;
  const close = clinic.settings.workingHours.close;
  return WEEK_DAYS.map((day) => ({
    day,
    open,
    close,
    closed: day === "Sunday",
  }));
}

function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function formatTime12h(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes} ${period}`;
}

function ProfileSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ProfileItem({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1 ${className}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="break-words text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <>—</>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function SocialLinks({
  social,
}: {
  social: ClinicProfile["socialMedia"] | undefined;
}) {
  const links = [
    { label: "Facebook", url: social?.facebook },
    { label: "Instagram", url: social?.instagram },
    { label: "Twitter", url: social?.twitter },
    { label: "LinkedIn", url: social?.linkedin },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));

  if (!links.length) return <>—</>;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ label, url }) => (
        <a
          key={label}
          href={withProtocol(url)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-accent"
        >
          <Globe className="size-3.5" />
          {label}
        </a>
      ))}
    </div>
  );
}
