import { CtaSection } from "@/components/cta-section";
import { FaqSection } from "@/components/faq-section";
import { FeatureSection } from "@/components/feature-section";
import { HairlineDivider } from "@/components/hairline-divider";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { LogoCloud } from "@/components/logo-cloud";
import { SiteFooter } from "@/components/site-footer";
import { TestimonialsSection } from "@/components/testimonials-section";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Clinics — Multi-Tenant Clinic Management",
  description:
    "My Clinics is a secure multi-tenant clinic management platform — appointments, medical records, prescriptions, billing and reports, with strict data isolation between clinics.",
};

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-col">
        <HeroSection />
        <HairlineDivider crosshairs />
        <LogoCloud />
        <div id="features" className="py-10 md:py-16">
          <FeatureSection />
        </div>
        <HairlineDivider crosshairs />
        <TestimonialsSection />
        <HairlineDivider crosshairs />
        <FaqSection />
        <HairlineDivider crosshairs />
        <CtaSection />
        <SiteFooter />
      </main>
    </>
  );
}
