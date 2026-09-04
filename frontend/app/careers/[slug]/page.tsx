import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Mail, Briefcase } from "lucide-react";
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

export default async function CareerRolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) notFound();

  const mailSubject = encodeURIComponent(`Application: ${job.title} — My Clinics`);
  const mailBody = encodeURIComponent(
    `Hi My Clinics team,\n\nI would like to apply for ${job.title} (${job.department} — ${job.location}).\n\nName:\nPhone:\nPortfolio/GitHub:\nLinkedIn:\n\nPlease find my resume attached.\n\nThanks!`
  );
  const mailHref = `mailto:${RESUME_EMAIL}?subject=${mailSubject}&body=${mailBody}`;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <Link href="/careers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to careers
          </Link>

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{job.department}</Badge>
              <Badge variant="outline" className="gap-1">
                <MapPin className="size-3" /> {job.location}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Briefcase className="size-3" /> {job.type}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">{job.title}</h1>
            <p className="mt-3 text-muted-foreground">{job.summary}</p>
            <p className="mt-2 text-sm text-muted-foreground">{job.description}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button render={<a href={mailHref} />} nativeButton={false} className="gap-2">
              <Mail className="size-4" /> Apply via {RESUME_EMAIL}
            </Button>
            <Button variant="outline" render={<Link href="/careers" />} nativeButton={false}>
              View all roles
            </Button>
          </div>

          <Separator className="my-8" />

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-semibold">What you will do</h2>
              <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-2">
                {job.responsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold">What we look for</h2>
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
            </div>
          </div>

          <div className="mt-10 rounded-xl border bg-muted/30 p-5">
            <h3 className="font-semibold">How to apply</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Send your resume (PDF) and portfolio/GitHub to{" "}
              <a href={mailHref} className="font-medium text-primary underline">
                {RESUME_EMAIL}
              </a>{" "}
              with subject <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{`Application: ${job.title}`}</span>. We reply within 3 working days.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">My Clinics is an equal opportunity employer. Remote-friendly, clinic-obsessed.</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
