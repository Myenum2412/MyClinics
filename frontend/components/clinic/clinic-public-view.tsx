"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { PublicClinic } from "@/lib/clinic-api";
import { formatMonthYear } from "@/lib/datetime";
import {
  Building2,
  MapPin,
  Globe,
  Calendar,
  Mail,
  Phone,
  Info,
  FileText,
  ClipboardList,
  Link as LinkIcon,
  Share2,
  Check,
} from "lucide-react";
import { useState } from "react";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ig-grad-pub" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ig-grad-pub)"
        d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.278.261 2.148.558 2.913.306.789.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.765.298 1.635.5 2.913.558C8.333 23.985 8.74 24 12 24s3.667-.015 4.947-.072c1.278-.06 2.148-.261 2.913-.558.789-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.337 1.384-2.126.298-.765.5-1.635.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.278-.261-2.148-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.862.63 19.097.333 18.227.131 16.947.072 15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.012 4.85.07 1.17.054 1.805.249 2.227.415.562.218.96.478 1.382.9.421.421.682.819.9 1.381.164.422.36 1.057.413 2.227.058 1.265.07 1.647.07 4.85s-.012 3.585-.07 4.85c-.054 1.17-.249 1.805-.413 2.227-.218.562-.478.96-.9 1.382-.421.421-.819.682-1.381.9-.422.164-1.057.36-2.227.413-1.265.058-1.647.07-4.85.07s-3.585-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.413-.562-.218-.96-.478-1.382-.9-.421-.421-.682-.819-.9-1.381-.164-.422-.36-1.057-.413-2.227-.058-1.265-.07-1.647-.07-4.85s.012-3.585.07-4.85c.054-1.17.249-1.805.413-2.227.218-.562.478-.96.9-1.382.421-.421.819-.682 1.381-.9.422-.164 1.057-.36 2.227-.413C8.415 2.172 8.797 2.16 12 2.16zm0 3.678a5.162 5.162 0 100 10.324 5.162 5.162 0 000-10.324zm0 8.566a3.404 3.404 0 110-6.808 3.404 3.404 0 010 6.808zm5.838-8.695a1.207 1.207 0 11-2.414 0 1.207 1.207 0 012.414 0z"
      />
    </svg>
  );
}
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#000" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#0A66C2" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.777 13.019H3.56V9h3.554v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
function listToText(list: string[] | null | undefined): string {
  return (list ?? []).join(", ") || "—";
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

export function ClinicPublicView({ clinic, avatarUrl }: { clinic: PublicClinic; avatarUrl: string | null }) {
  const profile = clinic.profile;
  const locationLabel = [profile?.city, profile?.state].filter(Boolean).join(", ") || "—";
  const joinedDateLabel = clinic.createdAt ? `Joined ${formatMonthYear(clinic.createdAt)}` : "Joined —";
  const handleLabel = clinic.slug || clinic.clinicId;
  const bioText = clinic.description || "No description provided.";
  const publicUrl = typeof window !== "undefined" ? window.location.href : "";
  const [copied, setCopied] = useState(false);

  const stats = [
    { label: "Established", value: orDash(profile?.establishedYear) },
    { label: "Specializations", value: String(profile?.specializations?.length ?? 0) },
    { label: "Services", value: String(profile?.services?.length ?? 0) },
  ];

  const weeklySchedule =
    clinic.settings?.weeklySchedule && clinic.settings.weeklySchedule.length > 0
      ? clinic.settings.weeklySchedule
      : [
          { day: "Monday", open: clinic.settings.workingHours.open, close: clinic.settings.workingHours.close, closed: false },
          { day: "Tuesday", open: clinic.settings.workingHours.open, close: clinic.settings.workingHours.close, closed: false },
          { day: "Wednesday", open: clinic.settings.workingHours.open, close: clinic.settings.workingHours.close, closed: false },
          { day: "Thursday", open: clinic.settings.workingHours.open, close: clinic.settings.workingHours.close, closed: false },
          { day: "Friday", open: clinic.settings.workingHours.open, close: clinic.settings.workingHours.close, closed: false },
          { day: "Saturday", open: clinic.settings.workingHours.open, close: clinic.settings.workingHours.close, closed: false },
          { day: "Sunday", open: clinic.settings.workingHours.open, close: clinic.settings.workingHours.close, closed: true },
        ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)]">
      <section className="w-full min-h-[calc(100vh-4rem)] rounded-xl border border-[#E3F2FD] bg-background overflow-hidden flex flex-col">
        <div className="h-32 w-full bg-linear-to-br from-foreground/10 via-[#E3F2FD] to-[#E3F2FD]/60" aria-hidden="true" />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="-mt-10">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={`${clinic.name} logo`} className="size-20 rounded-full border-4 border-background object-cover shadow-sm bg-background" />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full border-4 border-background bg-primary/10 text-2xl font-bold text-primary shadow-sm">
                  {clinic.name ? clinic.name.charAt(0).toUpperCase() : "C"}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
                {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
                {copied ? "Copied" : "Share profile"}
              </Button>
              <Link
                href="/login"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Book Appointment
              </Link>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">{clinic.name || "My Clinic"}</h1>
            <Badge variant="outline" className="bg-success/10 text-success border-success/25">
              <span className="mr-1.5 size-1.5 rounded-full bg-success" />
              {clinic.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">@{handleLabel}</p>
          {/* Public URL */}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <LinkIcon className="size-3.5" />
            <span className="truncate">
              Public URL: <span className="font-medium text-foreground">{typeof window !== "undefined" ? window.location.href : `/c/${clinic.slug || clinic.clinicId}`}</span>
            </span>
          </div>
          <p className="mt-3 text-sm/relaxed text-foreground/80">{bioText}</p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {stats.map((stat) => (
              <span key={stat.label} className="flex items-baseline gap-1.5">
                <span className="font-semibold tabular-nums">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </span>
            ))}
          </div>

          <ul className="mt-4 flex flex-col gap-2.5">
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {locationLabel}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Globe className="size-4 shrink-0" aria-hidden="true" />
              {clinic.website ? (
                <a href={clinic.website} target="_blank" rel="noreferrer" className="hover:underline">
                  {clinic.website}
                </a>
              ) : (
                "—"
              )}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Calendar className="size-4 shrink-0" aria-hidden="true" />
              {joinedDateLabel}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              {orDash(clinic.email)}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              {orDash(clinic.phone)}
            </li>
          </ul>

          <Tabs defaultValue="overview" className="mt-6 gap-4">
            <TabsList className="w-full bg-[#E3F2FD]">
              <TabsTrigger value="overview" className="flex-1">
                Overview
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex-1">
                Contact
              </TabsTrigger>
              <TabsTrigger value="practice" className="flex-1">
                Practice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Basic Details</h3>
                </div>
                <FieldGrid cols={4}>
                  <Field label="Clinic Name" value={clinic.name} />
                  <Field label="Clinic Type" value={orDash(profile?.clinicType)} />
                  <Field label="Registration Number" value={orDash(profile?.registrationNumber)} />
                  <Field label="Established Year" value={orDash(profile?.establishedYear)} />
                </FieldGrid>
              </div>

              <Separator />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Info className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Clinic Information</h3>
                </div>
                <FieldGrid cols={2}>
                  <Field label="About Clinic" className="col-span-2" value={orDash(clinic.description)} />
                  <Field label="Specializations" className="col-span-2" value={listToText(profile?.specializations)} />
                  <Field label="Services Offered" className="col-span-2" value={listToText(profile?.services)} />
                </FieldGrid>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Phone className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Phone Number" value={orDash(clinic.phone)} />
                  <Field label="WhatsApp Number" value={orDash(profile?.whatsapp)} />
                  <Field label="Email Address" value={orDash(clinic.email)} />
                  <Field label="Website" value={orDash(clinic.website)} />
                </FieldGrid>
              </div>

              <Separator />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <MapPin className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Clinic Address</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Address Line 1" className="col-span-3" value={orDash(profile?.addressLine1)} />
                  <Field label="Address Line 2" className="col-span-3" value={orDash(profile?.addressLine2)} />
                  <Field label="City" value={orDash(profile?.city)} />
                  <Field label="State" value={orDash(profile?.state)} />
                  <Field label="Country" value={orDash(profile?.country)} />
                  <Field label="Pincode" value={orDash(profile?.pincode)} />
                </FieldGrid>
              </div>
            </TabsContent>

            <TabsContent value="practice" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Working Hours</h3>
                </div>
                <Field label="Weekly Schedule" className="w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                    {weeklySchedule.map((sched) => (
                      <div key={sched.day} className="flex justify-between py-0.5 border-b border-[#E3F2FD]/30 last:border-0 sm:border-b-0">
                        <span className="font-medium text-foreground">{sched.day}</span>
                        <span>{sched.closed ? "Closed" : `${formatTime12h(sched.open)} – ${formatTime12h(sched.close)}`}</span>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>

              <Separator />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <ClipboardList className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Additional Details</h3>
                </div>
                <FieldGrid cols={2}>
                  <Field label="Emergency Contact" value={orDash(profile?.emergencyContact)} />
                  <Field label="Social Media Links" className="col-span-2">
                    <div className="flex flex-wrap gap-4">
                      {[
                        { label: "Facebook", url: profile?.socialMedia?.facebook, Icon: FacebookIcon },
                        { label: "Instagram", url: profile?.socialMedia?.instagram, Icon: InstagramIcon },
                        { label: "Twitter", url: profile?.socialMedia?.twitter, Icon: TwitterIcon },
                        { label: "LinkedIn", url: profile?.socialMedia?.linkedin, Icon: LinkedinIcon },
                      ].map(({ label, url, Icon }) =>
                        url ? (
                          <a
                            key={label}
                            href={url.startsWith("http") ? url : `https://${url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#E3F2FD] bg-background px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent transition"
                          >
                            <Icon className="size-4" />
                            {label}
                          </a>
                        ) : (
                          <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-[#E3F2FD] bg-[#E3F2FD]/60 px-3 py-1.5 text-sm text-muted-foreground">
                            <Icon className="size-4 opacity-50" />
                            {label}: —
                          </span>
                        )
                      )}
                    </div>
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}

function FieldGrid({ cols, children }: { cols: 1 | 2 | 3 | 4; children: React.ReactNode }) {
  return (
    <div
      className={`grid gap-4 ${cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : ""}`}
    >
      {children}
    </div>
  );
}

function Field({ label, value, children, className = "" }: { label: string; value?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {value !== undefined ? <p className="text-sm font-medium text-foreground">{value}</p> : children}
    </div>
  );
}
