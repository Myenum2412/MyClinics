import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FlaskConical,
  Handshake,
  Megaphone,
  Plug,
  Stethoscope,
} from "lucide-react";
import {
  PARTNER_BENEFITS,
  PARTNER_EMAIL,
  PARTNER_INTEGRATIONS,
  PARTNER_TYPES,
} from "@/lib/partners";

/** Partner type icons are referenced by name in lib/partners.ts. */
const PARTNER_ICONS = { Building2, Stethoscope, FlaskConical, Megaphone };

export const metadata: Metadata = {
  title: "Partner Program — Resell, Integrate or Refer | My Clinics",
  description:
    "Partner with My Clinics: reseller, referral and integration programs for clinic chains, EMR consultants, diagnostic labs, pharmacies and healthcare creators.",
  keywords: [
    "My Clinics partner program",
    "clinic software reseller program",
    "healthcare integration partners",
    "EMR reseller India",
    "clinic management software affiliate",
  ],
  alternates: { canonical: "/partners" },
  openGraph: {
    title: "Partner Program — Resell, Integrate or Refer | My Clinics",
    description:
      "Grow with My Clinics as a reseller, referral or integration partner — revenue share, co-marketing and dedicated onboarding for every clinic you bring onboard.",
    type: "website",
    url: "/partners",
  },
  twitter: {
    card: "summary_large_image",
    title: "Partner Program — My Clinics",
    description:
      "Reseller, referral and integration partnerships for clinic chains, EMR consultants, labs and pharmacies.",
  },
};

export default function PartnersPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
              <Handshake className="size-3.5" />
              Partner Program
            </span>
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Partner with My Clinics
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              We work with clinic chains, consultants, labs, pharmacies and creators who want to
              bring modern, WhatsApp-first clinic operations to more practices. Pick the partnership
              that fits, and we handle onboarding, training and support with you.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`mailto:${PARTNER_EMAIL}`}
                className={buttonVariants({ size: "lg", className: "rounded-xl px-6" })}
              >
                Become a Partner <ArrowRight className="ml-2 size-4" />
              </a>
              <Link
                href="/pricing"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "rounded-xl px-6",
                })}
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Who we partner with */}
        <section
          id="become-a-partner"
          className="scroll-mt-24 border-t bg-muted/40 px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Become a Partner
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Four ways to partner with us — choose one, or combine them as your practice grows.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PARTNER_TYPES.map(({ iconName, title, description }) => {
                const Icon = PARTNER_ICONS[iconName];
                return (
                  <div key={title} className="rounded-2xl border bg-card p-6 shadow-xs">
                    <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 rounded-2xl border bg-card p-6 shadow-xs sm:p-8">
              <h3 className="font-heading text-lg font-semibold tracking-tight">
                What every partner gets
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {PARTNER_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-muted-foreground">
                Commercial terms are agreed per partner. Write to{" "}
                <a href={`mailto:${PARTNER_EMAIL}`} className="underline hover:text-foreground">
                  {PARTNER_EMAIL}
                </a>{" "}
                with your region and the clinics you work with, and we will share the current
                program terms.
              </p>
            </div>
          </div>
        </section>

        {/* Integration partners */}
        <section id="integrations" className="scroll-mt-24 border-t px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <Plug className="size-3.5" />
                Integrations
              </span>
              <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Integration Partners
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Built on a multi-tenant, isolated data model with APIs and webhooks, so partner
                systems stay in sync with every clinic.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PARTNER_INTEGRATIONS.map(({ title, description }) => (
                <div key={title} className="rounded-2xl border bg-card p-6 shadow-xs">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-dashed bg-card/60 p-6">
                <h3 className="font-semibold text-foreground">Building something else?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Tell us about your product and the clinics you serve — we will scope a pilot
                  integration with your team.
                </p>
                <a
                  href={`mailto:${PARTNER_EMAIL}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Propose an integration <ArrowRight className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Partner portal / login */}
        <section
          id="partner-login"
          className="scroll-mt-24 border-t bg-muted/40 px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-3xl rounded-3xl border bg-gradient-to-r from-primary/10 via-background to-primary/5 p-8 text-center sm:p-12">
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Partner portal &amp; login
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              The partner portal — referral tracking, activation status and payout history — is
              rolling out in phases. Ask for early access and we will set up your account.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <a
                href={`mailto:${PARTNER_EMAIL}?subject=Partner%20portal%20early%20access`}
                className={buttonVariants({ size: "lg", className: "rounded-xl px-6" })}
              >
                Request portal access <ArrowRight className="ml-2 size-4" />
              </a>
              <Link
                href="/signup"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "rounded-xl px-6",
                })}
              >
                Create a clinic account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
