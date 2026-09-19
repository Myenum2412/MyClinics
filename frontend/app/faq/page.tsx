import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FaqsBlock } from "@/components/blocks/faqs-5";
import { buttonVariants } from "@/components/ui/button";
import { buildFaqPageSchema } from "@/lib/aeo-geo-faqs";
import { ArrowRight, MessageSquare, Clock, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "My Clinics Software FAQs — Everything You Need to Know | My Clinics",
  description:
    "Find answers to the most common questions doctors, clinic managers, and patients ask about My Clinics: WhatsApp booking, live OPD queues, digital prescriptions, EMR, billing, and data privacy.",
  keywords: [
    "My Clinics FAQs",
    "clinic management software FAQ",
    "WhatsApp doctor appointment booking",
    "clinic queue token system",
    "EMR software questions India",
    "clinic billing software",
    "digital prescriptions for doctors",
    "doctor patient management software",
  ],
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "My Clinics Software FAQs — Everything You Need to Know",
    description:
      "Frequently asked questions about My Clinics software: WhatsApp AI booking, live OPD queue management, digital prescriptions, billing, and security.",
    type: "website",
    url: "/faq",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Clinics Software FAQs",
    description:
      "Answers to the most common questions doctors and clinics ask about front-desk automation, WhatsApp booking, and clinic operations.",
  },
};

export default function FaqPage() {
  const faqSchema = buildFaqPageSchema();
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://myclinic.myenum.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "FAQs",
        item: "https://myclinic.myenum.in/faq",
      },
    ],
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Schema.org FAQPage & Breadcrumbs for AI Search Bots & Answer Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <SiteHeader />

      <main className="flex-1">
        {/* Interactive FAQ Block */}
        <FaqsBlock
          title="Frequently Asked Questions"
          subtitle="Everything doctors, clinic managers, and patients need to know about My Clinics software, setup, and features."
          badge="Product & Software Help Center"
        />

        {/* Informational Callout Grid */}
        <section className="w-full border-t bg-muted/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Built for Fast, Flawless Clinic Operations
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Everything you need to automate your front desk, eliminate no-shows, and provide modern patient care.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card p-6 shadow-xs">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">24/7 WhatsApp AI Assistant</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Patients book, reschedule, or check doctor timings directly over WhatsApp at any hour, reducing front-desk calls by up to 65%.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-xs">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">Live Queue & Turn Alerts</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Real-time token counters and automated 30-minute turn alerts notify patients when it is their turn, eliminating waiting-room chaos.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-xs">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">Strict Data Isolation</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Every clinic has an isolated tenant database. Your patient records, prescriptions, and financial data are private and 100% owned by you.
                </p>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-12 rounded-3xl border bg-gradient-to-r from-primary/10 via-background to-primary/5 p-8 text-center sm:p-12">
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ready to run your clinic on autopilot?
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Join 500+ clinics modernizing patient care, WhatsApp booking, and OPD operations with My Clinics.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className={buttonVariants({
                    size: "lg",
                    className: "rounded-xl px-6",
                  })}
                >
                  Get Started Free <ArrowRight className="ml-2 size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "rounded-xl px-6",
                  })}
                >
                  View Pricing Plans
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
