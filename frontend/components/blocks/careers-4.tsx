"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MapPin, ArrowRight, Mail } from "lucide-react";
import { JOBS, RESUME_EMAIL, type Job } from "@/lib/careers";

const departments = ["All", "Engineering", "AI", "Design", "Operations"] as const;

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
    <section className="w-full bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Careers at My Clinics</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Build the clinic platform India trusts</h1>
          <p className="text-sm text-muted-foreground">
            Join My Clinics — multi-tenant appointments, records, prescriptions, billing and WhatsApp AI. {JOBS.length} roles open.
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm">
            <Mail className="size-4 text-muted-foreground" />
            Send resume to{" "}
            <a href={`mailto:${RESUME_EMAIL}`} className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">
              {RESUME_EMAIL}
            </a>
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, location or keyword..."
              className="pl-8"
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
                  "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                  department === dept
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground" role="status" aria-live="polite">
          <span className="font-medium text-foreground tabular-nums">{results.length}</span> {results.length === 1 ? "role" : "roles"} found • Resumes → {RESUME_EMAIL}
        </p>

        <ScrollArea className="mt-2 h-[28rem] border-y border-border [&_[data-slot=scroll-area-viewport]]:scroll-fade-y">
          <ul className="flex flex-col divide-y divide-border">
            {results.map((job) => (
              <li key={job.slug}>
                <Link href={`/careers/${job.slug}`} className="group flex items-center justify-between gap-4 py-4 pr-3 hover:bg-muted/40 -mx-3 px-3 rounded-md transition-colors">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium group-hover:text-primary">{job.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{job.summary}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{job.department}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {job.location}
                      </span>
                      <Badge variant="secondary" className="font-normal">
                        {job.type}
                      </Badge>
                    </span>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
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

        <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="font-medium">Don’t see your role?</p>
          <p className="mt-1 text-muted-foreground">
            We’re always looking for clinic-obsessed builders. Send your resume and portfolio to{" "}
            <a href={`mailto:${RESUME_EMAIL}?subject=My Clinics Application`} className="text-primary underline">
              {RESUME_EMAIL}
            </a>{" "}
            with subject “Role — Your Name”.
          </p>
        </div>
      </div>
    </section>
  );
}
