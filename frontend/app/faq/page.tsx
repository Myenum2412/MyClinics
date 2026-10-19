import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import FaqsBlock from "@/components/blocks/faqs-5-7ovr";
import { buttonVariants } from "@/components/ui/button";
import { buildFaqPageSchema } from "@/lib/aeo-geo-faqs";
import { ArrowRight } from "lucide-react";

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
        {/* Interactive FAQ Block — @7ovr/faqs-5 (searchable FAQ with category tabs) */}
        <FaqsBlock />

        {/* Conversion CTA */}
        <section className="w-full border-t bg-muted/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-3xl border bg-gradient-to-r from-primary/10 via-background to-primary/5 p-8 text-center sm:p-12">
              <div className="flex flex-wrap items-center justify-center gap-4">
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
