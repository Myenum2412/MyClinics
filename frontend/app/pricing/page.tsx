import type { Metadata } from "next";
import { HeroHeader } from "@/components/hero-section-6-header";
import PricingBlock from "@/components/blocks/pricing-1";
import { FooterSection } from "@/components/footer-section";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for clinics of every size. Start free, then pick a plan when you're ready to grow.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Same fixed, dark header as the home page. */}
      <HeroHeader />
      <main className="flex-1 pt-20">
        <PricingBlock />
      </main>
      <FooterSection />
    </div>
  );
}
