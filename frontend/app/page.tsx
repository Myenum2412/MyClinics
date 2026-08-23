import FooterBlock from "@/components/footer-block";
import { HeroSection } from "@/components/hero";
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
      <HeroSection />
      <FooterBlock />
    </>
  );
}