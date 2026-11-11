import type { Metadata } from "next";
import { HeroHeader } from "@/components/hero-section-6-header";
import { FooterSection } from "@/components/footer-section";
import FaqsBlock from "@/components/blocks/faqs-1";
import { FAQ_DATA } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ) | My Clinics Clinic Management Software",
  description:
    "Explore 26 essential questions and verified answers about My Clinics: live WhatsApp token queues, 30-second digital prescriptions, ABHA & ABDM compliance, offline mode, billing, and clinic operations.",
  keywords: [
    "My Clinics FAQ",
    "clinic management software FAQ",
    "WhatsApp clinic queue management",
    "digital prescription software India",
    "ABDM compliant clinic software",
    "ABHA creation clinic software",
    "OPD token queue system",
    "EMR software for doctors",
    "clinic software questions",
    "medical practice management",
    "offline clinic software",
  ],
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "Frequently Asked Questions (FAQ) | My Clinics",
    description:
      "Explore 26 essential questions and verified answers about My Clinics: live WhatsApp token queues, 30-second digital prescriptions, ABHA & ABDM compliance, offline mode, billing, and clinic operations.",
    url: "/faq",
    siteName: "My Clinics",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frequently Asked Questions (FAQ) | My Clinics",
    description:
      "Explore 26 essential questions and verified answers about My Clinics: live WhatsApp token queues, 30-second digital prescriptions, ABHA & ABDM compliance, offline mode, billing, and clinic operations.",
  },
};

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": "https://myclinics.in/faq#faqpage",
        "url": "https://myclinics.in/faq",
        "name": "My Clinics Frequently Asked Questions",
        "description":
          "Frequently asked questions and verified answers regarding My Clinics clinic management system, live WhatsApp queue sync, ABDM compliance, and digital prescriptions.",
        "mainEntity": FAQ_DATA.map((item) => ({
          "@type": "Question",
          "name": item.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.a,
          },
        })),
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://myclinics.in/#software",
        "name": "My Clinics",
        "operatingSystem": "Web, iOS, Android, Windows, macOS",
        "applicationCategory": "MedicalBusinessApplication",
        "url": "https://myclinics.in",
        "description":
          "Modern cloud clinic management system and digital prescription suite with zero-app live WhatsApp queue tracking and ABDM compliance.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
        },
      },
    ],
  };

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background text-foreground">
      {/* Schema.org JSON-LD Structured Data for Search Engines & LLM Crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <HeroHeader />

      <main className="flex-1 pt-20">
        <FaqsBlock />
      </main>

      <FooterSection />
    </div>
  );
}