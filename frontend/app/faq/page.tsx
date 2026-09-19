import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FaqsBlock } from "@/components/blocks/faqs-5";
import { buttonVariants } from "@/components/ui/button";
import { buildFaqPageSchema } from "@/lib/aeo-geo-faqs";
import { ArrowRight, Bot, ShieldCheck, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "AEO & GEO Marketing FAQs — AI Search & Clinic Optimization | My Clinics",
  description:
    "Everything you need to know about Answer Engine Optimization (AEO), Generative Engine Optimization (GEO), and AI-driven clinic marketing. Learn how My Clinics puts doctors at the top of ChatGPT, Perplexity, and Google AI search.",
  keywords: [
    "AEO marketing for clinics",
    "GEO marketing healthcare",
    "Answer Engine Optimization clinics",
    "Generative Engine Optimization doctor",
    "ChatGPT clinic marketing",
    "Perplexity doctor search",
    "Google AI Overviews clinic SEO",
    "WhatsApp clinic booking automation",
    "clinic management software FAQ",
    "My Clinics FAQs",
  ],
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "AEO & GEO FAQs — Answer Engine & Generative Optimization for Clinics",
    description:
      "Discover how clinics use AEO & GEO to dominate AI search results on ChatGPT, Perplexity, Gemini, and Google AI Overviews with My Clinics.",
    type: "website",
    url: "/faq",
  },
  twitter: {
    card: "summary_large_image",
    title: "AEO & GEO FAQs | My Clinics",
    description:
      "Learn how Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) power patient acquisition and clinic discovery.",
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
        name: "FAQs (AEO & GEO)",
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
          title="AEO & GEO Healthcare FAQs"
          subtitle="Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) demystified for modern doctors, clinics, and healthcare practices."
          badge="AEO & GEO Knowledge Engine"
        />

        {/* Informational Callout & AI Readiness Grid */}
        <section className="w-full border-t bg-muted/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Why AEO & GEO Matter for Modern Clinics
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Patients no longer just browse links — they ask AI agents for direct doctor recommendations.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card p-6 shadow-xs">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">Zero-Click AI Answers</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Perplexity, ChatGPT Search, and Google AI Overviews deliver synthetic direct answers. AEO ensures your clinic is the cited source.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-xs">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Zap className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">Instant WhatsApp Conversion</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  When patients find your clinic through AI search, our 24/7 WhatsApp assistant immediately books appointments and answers clinic questions.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-xs">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">Verified Entity Authority</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Structured schemas and standard machine-readable files ensure LLMs present accurate clinic hours, fees, and specialties without hallucination.
                </p>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-12 rounded-3xl border bg-gradient-to-r from-primary/10 via-background to-primary/5 p-8 text-center sm:p-12">
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ready to optimize your clinic for AI search?
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Join 500+ clinics automating their front desk with WhatsApp AI and dominating local & generative search.
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
