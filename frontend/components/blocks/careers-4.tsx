"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  MapPin,
  ArrowRight,
  Mail,
  HeartPulse,
  Rocket,
  Users,
  ShieldCheck,
  Clock3,
  Globe,
  GraduationCap,
  Stethoscope,
} from "lucide-react";
import { JOBS, RESUME_EMAIL } from "@/lib/careers";

const departments = ["All", "Engineering", "AI", "Design", "Operations"] as const;

const benefits = [
  {
    icon: HeartPulse,
    title: "Health & Wellness",
    desc: "Medical insurance, wellness stipend and mental health support for you and family.",
  },
  {
    icon: Rocket,
    title: "Build at Scale",
    desc: "Ship to 500+ clinics. Multi-tenant platform with real patient impact every day.",
  },
  {
    icon: Globe,
    title: "Remote Friendly",
    desc: "Work from anywhere in India. Async by default, sync when it matters.",
  },
  {
    icon: GraduationCap,
    title: "Learn & Grow",
    desc: "₹50k yearly learning budget, mentorship and conference support.",
  },
  {
    icon: Clock3,
    title: "Flexible Hours",
    desc: "Family-first timings. Results matter, not punch-ins.",
  },
  {
    icon: ShieldCheck,
    title: "Ownership & Trust",
    desc: "Equity, transparent culture and clinic-grade data responsibility.",
  },
];

const values = [
  {
    icon: Stethoscope,
    title: "Clinic Obsessed",
    desc: "We start from the front desk, not the tech. Every feature answers a real clinic need.",
  },
  {
    icon: Users,
    title: "Own the Outcome",
    desc: "We hand off results, not tasks. If it ships with our name, we stand behind it.",
  },
  {
    icon: ShieldCheck,
    title: "Default to Trust",
    desc: "Security, privacy and reliability are the floor, not a feature toggle.",
  },
];

export default function CareersBlock() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<(typeof departments)[number]>("All");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return JOBS.filter((job) => {
      const matchesQuery =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.summary.toLowerCase().includes(q);
      const matchesDept = department === "All" || job.department === department;
      return matchesQuery && matchesDept;
    });
  }, [query, department]);

  return (
    <div className="w-full">
      {/* Hero with separate brand colour */}
      <section className="relative overflow-hidden bg-[#0D47A1] px-6 py-16 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_400px_at_20%_20%,rgba(144,202,249,0.25),transparent_60%),radial-gradient(600px_400px_at_80%_80%,rgba(33,150,243,0.3),transparent_65%)]"
        />
        <div className="relative mx-auto w-full max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-widest text-white/90 backdrop-blur">
            <span className="size-2 rounded-full bg-[#90CAF9] animate-pulse" />
            CAREERS AT MY CLINICS • HIRING NOW
          </p>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Build the clinic platform India trusts</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            Multi-tenant appointments, records, prescriptions, billing and WhatsApp AI — used by 500+ clinics. Join a team that ships fast and cares deeply about patient impact.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <a
              href={`mailto:${RESUME_EMAIL}?subject=My Clinics Application`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-[#0D47A1] shadow hover:bg-[#E3F2FD] transition-colors"
            >
              <Mail className="size-4" /> Send resume to {RESUME_EMAIL}
            </a>
            <span className="text-white/70 text-xs">Reply within 3 days • Equal opportunity</span>
          </div>
        </div>
      </section>

      {/* Search and roles with light brand background */}
      <section className="w-full bg-[#E3F2FD]/35 px-6 py-10 text-foreground">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#0D47A1]/60" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, location or keyword..."
                className="pl-8 border-[#90CAF9]/40 bg-white focus-visible:ring-[#2196F3]/30 focus-visible:border-[#2196F3]"
                aria-label="Search jobs"
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by department">
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  aria-pressed={department === dept}
                  onClick={() => setDepartment(dept)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    department === dept
                      ? "border-[#0D47A1] bg-[#0D47A1] text-white shadow"
                      : "border-[#90CAF9]/30 bg-white text-[#0D47A1]/70 hover:bg-white hover:text-[#0D47A1] hover:border-[#2196F3]/40"
                  )}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground" role="status" aria-live="polite">
            <span className="font-medium text-[#0D47A1] tabular-nums">{results.length}</span> {results.length === 1 ? "role" : "roles"} found • Resumes →{" "}
            <a href={`mailto:${RESUME_EMAIL}`} className="underline text-[#0D47A1] hover:text-[#2196F3]">
              {RESUME_EMAIL}
            </a>
          </p>

          <ScrollArea className="mt-3 h-[28rem] rounded-xl border border-[#90CAF9]/20 bg-white shadow-sm [&_[data-slot=scroll-area-viewport]]:scroll-fade-y">
            <ul className="flex flex-col divide-y divide-[#E3F2FD]">
              {results.map((job) => (
                <li key={job.slug}>
                  <Link
                    href={`/careers/${job.slug}`}
                    className="group flex items-center justify-between gap-4 p-4 hover:bg-[#E3F2FD]/50 transition-colors"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-semibold group-hover:text-[#0D47A1]">{job.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">{job.summary}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-[#2196F3]">{job.department}</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-[#0D47A1]/60" aria-hidden="true" />
                          {job.location}
                        </span>
                        <Badge variant="secondary" className="font-normal bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30">
                          {job.type}
                        </Badge>
                      </span>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-[#0D47A1]/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0D47A1]" aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {results.length === 0 && (
                <li className="py-10 text-center text-sm text-muted-foreground">
                  No roles match your search. Try another keyword or email {RESUME_EMAIL}.
                </li>
              )}
            </ul>
          </ScrollArea>

          <div className="mt-6 rounded-xl border border-[#90CAF9]/30 bg-white p-4 text-sm">
            <p className="font-semibold text-[#0D47A1]">Don’t see your role?</p>
            <p className="mt-1 text-muted-foreground">
              We’re always looking for clinic-obsessed builders. Send your resume and portfolio to{" "}
              <a href={`mailto:${RESUME_EMAIL}?subject=My Clinics Application`} className="font-medium text-[#0D47A1] underline">
                {RESUME_EMAIL}
              </a>{" "}
              with subject “Role — Your Name”. We reply within 3 working days.
            </p>
          </div>
        </div>
      </section>

      {/* More content: values, benefits, life */}
      <section className="w-full bg-white px-6 py-14">
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#0D47A1]">Why My Clinics?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We build for doctors and patients, not demos. Small team, large ownership, real impact.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border border-[#E3F2FD] bg-[#E3F2FD]/20 p-4">
                <v.icon className="size-6 text-[#0D47A1]" />
                <h3 className="mt-3 font-semibold text-sm">{v.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-[#0D47A1] px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Benefits that care for you</h2>
          <p className="mt-2 text-sm text-white/70">We take care of our team so you can take care of clinics.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="flex gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <b.icon className="size-5 shrink-0 text-[#90CAF9]" />
                <div>
                  <h3 className="font-medium text-sm">{b.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${RESUME_EMAIL}?subject=My Clinics Application`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#0D47A1] hover:bg-[#E3F2FD] transition-colors"
            >
              <Mail className="size-4" /> Apply now → {RESUME_EMAIL}
            </a>
            <Link href="/#pricing" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10">
              View product
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
