import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import AboutBlock from "@/components/blocks/about-3";
import { AuroraText } from "@/components/ui/aurora-text";
import { HowItWorks } from "@/components/how-it-works";
import { EasyChat } from "@/components/easy-chat";

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
            Book appointments in seconds, access prescriptions instantly, and keep all your medical records safe — one trusted place for your family&apos;s healthcare.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "min-w-[140px]")}>Sign In</Link>
            <Link href="/clinic" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "min-w-[140px]")}>Go to Clinic</Link>
          </div>
        </div>
      </main>
      <HowItWorks />
      <EasyChat />
      <AboutBlock />
      <SiteFooter />
    </div>
  );
}
