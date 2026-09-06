import type { Metadata } from "next";

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
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import AboutBlock from "@/components/blocks/about-3";
import { HowItWorks } from "@/components/how-it-works";
import { InfiniteMarquee } from "@/src/components/wensity/infinite-marquee";
import { EasyChat } from "@/components/easy-chat";
import { AnimateIn } from "@/components/animate-in";
import { OnePlatform } from "@/components/one-platform";
import { CardSwapSection } from "@/components/card-swap-section";
import { PricingModern } from "@/components/smoothui/pricing-2";
import HeroSection from "@/components/hero-section-1";
export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <HeroSection />
      <div className="w-full border-y bg-white py-4 overflow-hidden">
        <InfiniteMarquee
          speed={28}
          gap="gap-10"
          fade={false}
          items={[
            <span key="1" className="text-sm font-semibold tracking-widest text-black whitespace-nowrap">TRUSTED BY 500+ CLINICS</span>,
            <span key="2" className="text-sm font-semibold tracking-widest text-black">•</span>,
            <span key="3" className="text-sm font-semibold tracking-widest text-black whitespace-nowrap">SECURE & COMPLIANT</span>,
            <span key="4" className="text-sm font-semibold tracking-widest text-black">•</span>,
            <span key="5" className="text-sm font-semibold tracking-widest text-black whitespace-nowrap">24/7 SUPPORT</span>,
            <span key="6" className="text-sm font-semibold tracking-widest text-black">•</span>,
            <span key="7" className="text-sm font-semibold tracking-widest text-black whitespace-nowrap">APPOINTMENTS • BILLING • REPORTS</span>,
          ]}
        />
      </div>
      <CardSwapSection />
      <AnimateIn><HowItWorks /></AnimateIn>
      <AnimateIn delay={0.1}><EasyChat /></AnimateIn>
      <AnimateIn delay={0.15}><AboutBlock /></AnimateIn>
      <PricingModern />
      <AnimateIn delay={0.05}><OnePlatform /></AnimateIn>
      <SiteFooter />
    </div>
  );
}
