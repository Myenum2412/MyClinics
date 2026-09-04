import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
import { AuroraText } from "@/components/ui/aurora-text";
import { HowItWorks } from "@/components/how-it-works";
import { InfiniteMarquee } from "@/src/components/wensity/infinite-marquee";
import { EasyChat } from "@/components/easy-chat";
import { AnimateIn } from "@/components/animate-in";
import { OnePlatform } from "@/components/one-platform";
import { CardSwapSection } from "@/components/card-swap-section";
import { PricingModern } from "@/components/smoothui/pricing-2";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative flex min-h-[calc(100svh-4rem)] flex-1 items-center justify-center overflow-hidden">
        <Image src="/bghome.png" alt="My Clinics Background" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="text-white">Your Health,</span>{" "}
            <AuroraText colors={["#60A5FA", "#34D399", "#A78BFA", "#F472B6"]} speed={1.2}>Simplified</AuroraText>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl">
            Book appointments in seconds, access prescriptions instantly, and keep all your medical records safe  one trusted place for your family&apos;s healthcare.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "min-w-[140px]")}>Sign In</Link>
            <Link href="/clinic" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "min-w-[140px]")}>Go to Clinic</Link>
          </div>
        </div>
      </main>
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
