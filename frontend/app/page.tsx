import type { Metadata, Viewport } from "next";
import Image from "next/image";
import HeroSection6 from "@/components/hero-section-6";
import FeaturesBlock from "@/components/blocks/features-1-7ovr";
import IntegrationsMarquee from "@/components/blocks/integrations-2-marquee";
import NewsletterHomeBlock from "@/components/blocks/newsletter-home";
import { FooterSection } from "@/components/footer-section";

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    absolute: "Book Doctor Appointments Online | Clinic Management Software — My Clinics",
  },
  description:
    "Book doctor appointments online in under a minute. My Clinics is all-in-one clinic management software for appointments, patient records, prescriptions, billing & pharmacy — with WhatsApp booking & AI assistant. Trusted by 500+ clinics.",
  keywords: [
    "clinic management software",
    "clinic management system",
    "doctor appointment booking",
    "book doctor appointment online",
    "online doctor appointment",
    "patient record management",
    "EMR software",
    "clinic billing software",
    "pharmacy management software",
    "hospital management system",
    "My Clinics",
  ],
  openGraph: {
    title: "Book Doctor Appointments Online | Clinic Management Software — My Clinics",
    description:
      "Book doctor appointments online in under a minute. All-in-one clinic management software for appointments, records, billing, prescriptions & pharmacy with WhatsApp & AI booking.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Book Doctor Appointments Online | Clinic Management Software — My Clinics",
    description:
      "Book doctor appointments online in under a minute. All-in-one clinic management software with WhatsApp & AI booking.",
  },
};

export default function Home() {
  return (
    <div className="relative isolate min-h-svh bg-black text-white selection:bg-blue-600 selection:text-white">
      {/* Dimmed dashboard backdrop, pinned to the viewport so it never stretches. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <Image
          src="/homebgp.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top opacity-25"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.9))]" />
      </div>

      <div className="relative z-10">
        <HeroSection6 />
        <FeaturesBlock />
        <IntegrationsMarquee />
        <NewsletterHomeBlock />
        <FooterSection />
      </div>
    </div>
  );
}
