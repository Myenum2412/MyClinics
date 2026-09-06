import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PricingModern } from "@/components/smoothui/pricing-2";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing for every clinic — Starter, Growth, Scale. Monthly or yearly billing.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <PricingModern />
      <SiteFooter />
    </div>
  );
}
