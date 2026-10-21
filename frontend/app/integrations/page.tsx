import type { Metadata } from "next";
import { HeroHeader } from "@/components/hero-section-6-header";
import { FooterSection } from "@/components/footer-section";
import IntegrationsBlock from "@/components/blocks/integrations-4";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Connect My Clinics with WhatsApp, Google Calendar, Razorpay, Tally, GoDaddy, Google Drive and Zapier — so your clinic runs without double entry.",
};

export default function IntegrationsPage() {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background text-foreground">
      <HeroHeader />

      <main className="flex-1 pt-20">
        <IntegrationsBlock />
      </main>

      <FooterSection />
    </div>
  );
}
