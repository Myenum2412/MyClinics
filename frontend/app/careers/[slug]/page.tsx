import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Mail,
  Briefcase,
  Clock3,
  HeartPulse,
  ShieldCheck,
  Rocket,
  Users,
  Stethoscope,
  CheckCircle2,
  CalendarCheck,
} from "lucide-react";
import { JOBS, RESUME_EMAIL, getJobBySlug } from "@/lib/careers";
import type { Metadata } from "next";

export function generateStaticParams() {
  return JOBS.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) return { title: "Role not found — My Clinics" };
  return {
    title: `${job.title} — Careers — My Clinics`,
    description: job.summary,
  };
}

const benefits = [
  { icon: HeartPulse, title: "Health cover", desc: "Medical for you and family" },
  { icon: Rocket, title: "Real impact", desc: "500+ clinics, patients daily" },
  { icon: Clock3, title: "Flexible", desc: "Async, family-first hours" },
  { icon: ShieldCheck, title: "Ownership", desc: "Equity and trust" },
];

export default async function CareerRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) notFound();

  const mailSubject = encodeURIComponent(`Application: ${job.title} — My Clinics`);
  const mailBody = encodeURIComponent(
    `Hi My Clinics team,\n\nI would like to apply for ${job.title} (${job.department} — ${job.location}).\n\nName:\nPhone:\nPortfolio/GitHub:\nLinkedIn:\nCurrent CTC / Expected:\nNotice period:\n\nPlease find my resume attached.\n\nThanks!`
  );
  const mailHref = `mailto:${RESUME_EMAIL}?subject=${mailSubject}&body=${mailBody}`;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero with brand colour */}
        <div className="relative overflow-hidden bg-[#0D47A1] px-6 py-10 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_20%_20%,rgba(144,202,249,0.2),transparent_60%),radial-gradient(500px_300px_at_80%_80%,rgba(33,150,243,0.25),transparent_65%)]"
          />
          <div className="relative mx-auto w-full max-w-3xl">
            <Link href="/careers" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <ArrowLeft className="size-4" /> Back to careers
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge className="bg-white text-[#0D47A1] hover:bg-white/90">{job.department}</Badge>
              <Badge variant="outline" className="gap-1 border-white/30 text-white bg-white/10">
                <MapPin className="size-3" /> {job.location}
              </Badge>
              <Badge variant="outline" className="gap-1 border-white/30 text-white bg-white/10">
                <Briefcase className="size-3" /> {job.type}
              </Badge>
              <Badge variant="outline" className="gap-1 border-white/30 text-white bg-white/10">
                <Mail className="size-3" /> {RESUME_EMAIL}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{job.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{job.summary}</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">{job.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button render={<a href={mailHref} />} nativeButton={false} className="bg-white text-[#0D47A1] hover:bg-[#E3F2FD] gap-2">
                <Mail className="size-4" /> Apply via {RESUME_EMAIL}
              </Button>
              <Button
                variant="outline"
                render={<Link href="/careers" />}
                nativeButton={false}
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                View all roles
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          {/* Quick facts */}
          <div className="grid gap-4 rounded-xl border border-[#E3F2FD] bg-[#E3F2FD]/30 p-4 sm:grid-cols-3">
            <div className="flex gap-3">
              <CalendarCheck className="size-5 text-[#0D47A1] shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#0D47A1] uppercase">Start</p>
                <p className="text-sm">ASAP • 2-week decision</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Users className="size-5 text-[#0D47A1] shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#0D47A1] uppercase">Team</p>
                <p className="text-sm">Engineering • AI • Design</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Stethoscope className="size-5 text-[#0D47A1] shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#0D47A1] uppercase">Impact</p>
                <p className="text-sm">Clinics, patients daily</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-semibold text-[#0D47A1]">What you will do</h2>
              <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-2">
                {job.responsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="mt-6 rounded-lg border border-[#90CAF9]/20 bg-white p-4">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Rocket className="size-4 text-[#0D47A1]" /> Day-to-day at My Clinics
                </h3>
                <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground space-y-1.5">
                  <li>Morning standup (async), deep work, clinic feedback review</li>
                  <li>Ship behind feature flags, measure, iterate with real clinics</li>
                  <li>Pair with AI/WhatsApp team for end-to-end patient journeys</li>
                  <li>Friday demos — show what you shipped</li>
                </ul>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-[#0D47A1]">What we look for</h2>
              <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-2">
                {job.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {job.niceToHave && (
                <>
                  <h3 className="mt-4 font-medium text-sm">Nice to have</h3>
                  <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {job.niceToHave.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </>
              )}
              <div className="mt-6 rounded-lg border border-[#E3F2FD] bg-[#E3F2FD]/30 p-4">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#0D47A1]" /> Our values
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Clinic obsessed, own the outcome, default to trust. We build for doctors and patients, not demos.
                </p>
              </div>
            </div>
          </div>

          {/* Interview process */}
          <div className="mt-10">
            <h2 className="font-semibold text-[#0D47A1]">Interview process</h2>
            <p className="mt-1 text-xs text-muted-foreground">Fast, respectful, transparent — 7 to 10 days total.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[
                { step: "1", title: "Resume review", desc: "We reply in 3 days" },
                { step: "2", title: "Intro call", desc: "30 min, culture & role" },
                { step: "3", title: "Task / Pairing", desc: "Real clinic problem, 60 min" },
                { step: "4", title: "Offer", desc: "Comp & start date" },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-[#90CAF9]/20 bg-white p-4 text-center">
                  <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-[#0D47A1] text-sm font-bold text-white">
                    {s.step}
                  </span>
                  <p className="mt-2 font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-10">
            <h2 className="font-semibold text-[#0D47A1]">Perks & benefits</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <div key={b.title} className="flex gap-3 rounded-xl border border-[#E3F2FD] bg-white p-4">
                  <b.icon className="size-5 shrink-0 text-[#0D47A1]" />
                  <div>
                    <p className="font-medium text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* About My Clinics */}
          <div className="mt-10 rounded-xl border border-[#90CAF9]/20 bg-gradient-to-br from-[#E3F2FD]/60 to-white p-6">
            <h3 className="font-semibold flex items-center gap-2">
              <Stethoscope className="size-5 text-[#0D47A1]" /> About My Clinics
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              My Clinics is a secure multi-tenant platform for doctors and clinics. One Clinic ID isolates all data — appointments, records, prescriptions, billing and reports. A WhatsApp AI books, reminds and answers from grounded knowledge. We are a small, senior team that ships daily and measures impact in patients, not tickets.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white border px-3 py-1">Next.js 16 • React 19</span>
              <span className="rounded-full bg-white border px-3 py-1">Fastify 5 • MongoDB</span>
              <span className="rounded-full bg-white border px-3 py-1">NVIDIA NIM • RAG</span>
              <span className="rounded-full bg-white border px-3 py-1">WhatsApp • R2</span>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="rounded-xl border bg-[#0D47A1] p-6 text-white">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="size-5 text-[#90CAF9]" /> How to apply
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Send your resume (PDF) and portfolio/GitHub/LinkedIn to{" "}
              <a href={mailHref} className="font-semibold text-white underline">
                {RESUME_EMAIL}
              </a>{" "}
              with subject <span className="font-mono text-xs bg-white/15 px-1.5 py-0.5 rounded text-white">{`Application: ${job.title}`}</span>.
            </p>
            <ul className="mt-3 list-disc pl-5 text-xs text-white/70 space-y-1">
              <li>Attach resume • Add GitHub/portfolio • Mention notice period & CTC</li>
              <li>We reply within 3 working days — even if it’s a no, you’ll hear from us</li>
              <li>Equal opportunity, remote-friendly, clinic-obsessed</li>
            </ul>
            <div className="mt-5 flex gap-3">
              <Button render={<a href={mailHref} />} nativeButton={false} className="bg-white text-[#0D47A1] hover:bg-[#E3F2FD] gap-2">
                <CheckCircle2 className="size-4" /> Apply now
              </Button>
              <Button variant="outline" render={<Link href="/careers" />} nativeButton={false} className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                View all roles
              </Button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Questions? Email <a href={`mailto:${RESUME_EMAIL}`} className="underline text-[#0D47A1]">{RESUME_EMAIL}</a> • My Clinics, India
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
