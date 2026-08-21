"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Bone,
  Baby,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock,
  Flower2,
  Globe,
  HeartPulse,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Settings2,
  Sparkles,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import type { Clinic } from "@/lib/clinic-api";
import {
  getOwnClinic,
  listAppointments,
  listBills,
  listDoctors,
  listPatients,
  listStaff,
  uploadAvatar,
} from "@/lib/clinic-api";
import { PersonAvatar, bustAvatarCache } from "@/components/clinic/person-avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_SPECIALTIES = [
  "General Medicine",
  "Pediatrics",
  "Dermatology",
  "Gynecology",
  "Orthopedics",
];

const SETTINGS_ROWS = [
  { label: "Clinic Preferences", icon: Settings2, href: "/clinic/settings" },
  { label: "Notification Settings", icon: Bell, href: "/clinic/notifications" },
  { label: "Billing & Invoice Settings", icon: ReceiptText, href: "/clinic/billing" },
  { label: "Users & Staff", icon: UserCog, href: "/clinic/settings" },
];

function specialtyIcon(specialty: string) {
  const name = specialty.toLowerCase();
  if (name.includes("pediatr")) return Baby;
  if (name.includes("derm")) return Sparkles;
  if (name.includes("gyne") || name.includes("gynae")) return Flower2;
  if (name.includes("ortho")) return Bone;
  if (name.includes("general") || name.includes("medicine") || name.includes("physician"))
    return Stethoscope;
  return HeartPulse;
}

function formatTime(value: string | undefined, fallback = "9:00 AM") {
  if (!value) return fallback;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h)) return value;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function memberSince(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="flex flex-1 flex-col p-5">{children}</div>
    </Card>
  );
}

const MAP_TILE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M40 0H0V40' fill='none' stroke='%23e2e8f0' stroke-width='1'/></svg>";

export default function ClinicProfilePage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [stats, setStats] = useState<{
    patients: number;
    apptsToday: number;
    doctors: number;
    staff: number;
    revenue: number;
    invoices: number;
  } | null>(null);
  const [specialties, setSpecialties] = useState<string[]>(DEFAULT_SPECIALTIES);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [photoRefresh, setPhotoRefresh] = useState(0);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    Promise.all([
      getOwnClinic(clinicId),
      listPatients(clinicId, { limit: 1 }),
      listAppointments(clinicId, { date: localDateString(), limit: 1 }),
      listDoctors(clinicId, { limit: 100 }),
      listStaff(clinicId, { limit: 1 }),
      listBills(clinicId, { limit: 100 }),
    ])
      .then(([c, p, a, d, s, b]) => {
        if (!active) return;
        setClinic(c);
        setStats({
          patients: p.total,
          apptsToday: a.total,
          doctors: d.total,
          staff: s.total,
          revenue: b.items.reduce((sum, bill) => sum + (bill.total ?? 0), 0),
          invoices: b.total,
        });
        const found = Array.from(
          new Set(
            d.items
              .map((doc) => doc.specialization?.trim())
              .filter((value): value is string => Boolean(value))
          )
        ).slice(0, 5);
        if (found.length > 0) setSpecialties(found);
      })
      .catch(() => {
        if (active) toast.error("Failed to load clinic profile");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId]);

  async function handleCoverUpload(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG or PNG images are allowed");
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadAvatar(clinicId, "clinic", clinicId, file);
      bustAvatarCache(clinicId, "clinic", clinicId);
      setPhotoRefresh((r) => r + 1);
      toast.success("Cover photo updated");
    } catch {
      toast.error("Failed to upload cover photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const workingHours = clinic?.settings.workingHours;
  const hoursRange = workingHours
    ? `${formatTime(workingHours.open)} – ${formatTime(workingHours.close)}`
    : "9:00 AM – 6:00 PM";

  const contactRows = [
    { icon: Phone, label: "Phone", value: clinic?.phone ?? "", href: clinic?.phone ? `tel:${clinic.phone}` : undefined },
    { icon: Mail, label: "Email", value: clinic?.email ?? "", href: clinic?.email ? `mailto:${clinic.email}` : undefined },
    { icon: Globe, label: "Website", value: clinic?.website ?? "", href: clinic?.website ? (clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`) : undefined },
  ];

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/clinic">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Clinic Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Clinic Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your clinic information and preferences
          </p>
        </div>
        <Button render={<a href="/clinic/account" />} nativeButton={false} className="gap-2">
            <Camera className="size-4" />
            Edit Profile
          </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[300px_minmax(0,1fr)_1px_320px]">
          <div className="relative min-h-52 lg:min-h-full">
            <div
              className="absolute inset-0 bg-sky-100"
              style={{ backgroundImage: `url("${MAP_TILE}")` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[64px] font-semibold text-sky-200 select-none">
                  {clinic?.name?.charAt(0) ?? "C"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Upload cover photo"
              className="absolute right-4 bottom-4 flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground disabled:opacity-60"
            >
              <Camera className="size-4" />
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                handleCoverUpload(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex flex-col justify-center gap-1.5 p-6 md:p-8">
            <div className="flex items-center gap-4">
              <PersonAvatar
                clinicId={clinicId}
                ownerType="clinic"
                ownerId={clinicId}
                name={clinic?.name ?? "Clinic"}
                size="md"
                refreshKey={photoRefresh}
                className="size-20 rounded-full ring-4 ring-background shadow-sm"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                    {clinic?.name ?? "My Clinic"}
                  </h2>
                  <BadgeCheck className="size-5 shrink-0 text-sky-500" />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Compassionate Care, Better Health
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">
                ID: {clinic?.slug ?? clinic?.clinicId ?? "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                Member since {memberSince(clinic?.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                <span className="size-1.5 rounded-full bg-success" />
                Active
              </span>
            </div>
          </div>
          <div className="hidden bg-border lg:block" />
          <div className="flex flex-col justify-center gap-5 p-6 md:p-8">
            {contactRows.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-center gap-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Icon className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {href ? (
                    <a
                      href={href}
                      className="block truncate text-sm font-medium text-foreground hover:text-sky-600 hover:underline"
                    >
                      {value || "—"}
                    </a>
                  ) : (
                    <p className="truncate text-sm font-medium text-foreground">{value || "—"}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Clinic Information">
          <div className="divide-y divide-border">
            <InfoRow label="Clinic Name" value={clinic?.name ?? ""} />
            <InfoRow label="Registration Number" value={clinic?.slug ?? ""} />
            <InfoRow label="Clinic Type" value="Private Clinic" />
            <InfoRow label="Established On" value={memberSince(clinic?.createdAt)} />
            <InfoRow label="GST Number" value="" />
            <InfoRow label="PAN Number" value="" />
            <InfoRow label="Email" value={clinic?.email ?? ""} />
            <InfoRow label="Phone" value={clinic?.phone ?? ""} />
            <InfoRow label="Alternate Phone" value="" />
          </div>
        </SectionCard>

        <SectionCard title="Clinic Address">
          <div className="divide-y divide-border">
            <InfoRow label="Address Line 1" value={clinic?.address ?? ""} />
            <InfoRow label="Address Line 2" value="" />
            <InfoRow label="City" value="" />
            <InfoRow label="State" value="" />
            <InfoRow label="Pincode" value="" />
            <InfoRow label="Country" value="India" />
          </div>
          <div className="relative mt-5 flex h-52 overflow-hidden rounded-xl border border-border">
            <div
              className="absolute inset-0 bg-sky-50"
              style={{ backgroundImage: `url("${MAP_TILE}")` }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] flex flex-col items-center">
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-center shadow-sm">
                <p className="text-xs font-semibold">{clinic?.name ?? "My Clinic"}</p>
                <p className="mt-0.5 max-w-52 truncate text-[11px] text-muted-foreground">
                  {clinic?.address || "Address not updated"}
                </p>
              </div>
              <MapPin className="size-8 fill-sky-100 text-sky-600" />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <SectionCard title="Working Hours">
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">Monday – Friday</span>
              <span className="text-sm font-medium">{hoursRange}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">Saturday</span>
              <span className="text-sm font-medium">{hoursRange}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">Sunday</span>
              <span className="text-sm font-medium text-muted-foreground">Closed</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">Emergency availability</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                <span className="size-1.5 rounded-full bg-success" />
                24/7 Available
              </span>
            </div>
          </div>
          <div className="mt-auto pt-5">
            <Button
              render={<a href="/clinic/settings" />}
              nativeButton={false}
              variant="outline"
              className="w-full gap-2 text-muted-foreground"
            >
                <Clock className="size-4" />
                Manage Working Hours
              </Button>
          </div>
        </SectionCard>

        <SectionCard title="Specialties">
          <div className="divide-y divide-border">
            {specialties.map((specialty) => {
              const Icon = specialtyIcon(specialty);
              return (
                <div key={specialty} className="flex items-center gap-3 py-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <Icon className="size-4" />
                  </div>
                  <span className="text-sm font-medium">{specialty}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-auto pt-5">
            <Button
              render={<a href="/clinic/doctors" />}
              nativeButton={false}
              variant="outline"
              className="w-full gap-2 text-muted-foreground"
            >
                View All Specialties
              </Button>
          </div>
        </SectionCard>

        <SectionCard title="Clinic Settings">
          <div className="divide-y divide-border">
            {SETTINGS_ROWS.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center gap-3 py-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Icon className="size-4" />
                </div>
                <span className="flex-1 text-sm font-medium">{label}</span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
          <div className="mt-auto pt-5">
            <Button
              render={<a href="/clinic/settings" />}
              nativeButton={false}
              variant="outline"
              className="w-full gap-2 text-muted-foreground"
            >
                <Settings2 className="size-4" />
                Manage Settings
              </Button>
          </div>
        </SectionCard>
      </div>

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-[15px] font-semibold tracking-tight">Clinic Overview</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Key metrics across your clinic
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Patients"
            value={stats?.patients.toLocaleString("en-IN") ?? "0"}
            subtext="Registered patients"
            icon={Users}
          />
          <StatCard
            label="Appointments"
            value={stats?.apptsToday.toLocaleString("en-IN") ?? "0"}
            subtext="Scheduled today"
            icon={CalendarDays}
          />
          <StatCard
            label="Doctors"
            value={stats?.doctors.toLocaleString("en-IN") ?? "0"}
            subtext="Active specialists"
            icon={Stethoscope}
          />
          <StatCard
            label="Staff Members"
            value={stats?.staff.toLocaleString("en-IN") ?? "0"}
            subtext="Team members"
            icon={UserCog}
          />
          <StatCard
            label="Total Revenue"
            value={`₹${(stats?.revenue ?? 0).toLocaleString("en-IN")}`}
            subtext={`From ${stats?.invoices ?? 0} invoices`}
            icon={IndianRupee}
          />
        </div>
      </Card>

      <footer className="border-t border-border pt-6 pb-2 text-center text-sm text-muted-foreground">
        © 2024 MyClinic. All rights reserved.
      </footer>
    </main>
  );
}