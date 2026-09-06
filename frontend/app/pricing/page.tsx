import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PricingModern } from "@/components/smoothui/pricing-2";

export const metadata: Metadata = {
  title: "Pricing Plans for Clinics | My Clinics",
  description:
    "Transparent pricing for My Clinics — Starter ₹7,000/mo, Growth ₹12,000/mo, Scale ₹20,000/mo. Yearly saves ~17% (2 months free). GST extra. All plans include appointments, billing, records, WhatsApp booking & secure multi-tenant isolation.",
  keywords: [
    "clinic management software pricing",
    "clinic software price India",
    "doctor clinic pricing plans",
    "My Clinics pricing",
    "hospital management system cost",
    "EMR software pricing India",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "My Clinics Pricing — Plans for Every Clinic",
    description:
      "Choose Starter, Growth or Scale — from ₹7,000/mo. Yearly billing saves 2 months. Secure, GST extra.",
    type: "website",
    url: "/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Clinics Pricing — Plans for Every Clinic",
    description: "Starter ₹7k, Growth ₹12k, Scale ₹20k/mo. Yearly saves ~17%.",
  },
};

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "My Clinics",
  description: "Clinic management software for appointments, patient records, billing, prescriptions & pharmacy.",
  brand: { "@type": "Brand", name: "My Clinics" },
  offers: [
    { "@type": "Offer", name: "Starter", price: "7000", priceCurrency: "INR", priceValidUntil: "2027-12-31", url: "/pricing", availability: "https://schema.org/InStock" },
    { "@type": "Offer", name: "Growth", price: "12000", priceCurrency: "INR", priceValidUntil: "2027-12-31", url: "/pricing", availability: "https://schema.org/InStock" },
    { "@type": "Offer", name: "Scale", price: "20000", priceCurrency: "INR", priceValidUntil: "2027-12-31", url: "/pricing", availability: "https://schema.org/InStock" },
  ],
};

export default function PricingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }} />
      <SiteHeader />
      <PricingModern />
      <SiteFooter />
    </div>
  );
}
