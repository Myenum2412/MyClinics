import FooterBlock from "@/components/footer-block";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero";
import { LogoCloud } from "@/components/logo-cloud";
import { FeatureSection } from "@/components/feature-section";
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
      <HeroSection />
      <LogoCloud />
      <div id="features">
        <FeatureSection />
      </div>
      <FooterBlock />
    </>
  );
}