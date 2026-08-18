import CloudShaderHeroDemo from "@/components/cloud-shader-hero-demo";
import FeaturesBlock from "@/components/features-block";
import FooterBlock from "@/components/footer-block";
import type { Metadata } from "next";
import BentoBlock from "@/components/bento-block";
import FaqsBlock from "@/components/faqs-block";
import SecondaryHeroBlock from "@/components/secondary-hero-block";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Clinics — Multi-Tenant Clinic Management",
  description:
    "My Clinics is a secure multi-tenant clinic management platform — appointments, medical records, prescriptions, billing and reports, with strict data isolation between clinics.",
};

export default function Home() {
  return (
    <>
      <CloudShaderHeroDemo />
      <BentoBlock />
      <FeaturesBlock />
      <SecondaryHeroBlock />
      <FaqsBlock />
      <FooterBlock />
    </>
  );
}