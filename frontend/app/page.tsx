import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import AboutBlock from "@/components/blocks/about-3";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      {/* Full Screen Hero Section */}
      <main className="relative flex min-h-[calc(100svh-4rem)] flex-1 items-center justify-center overflow-hidden">
        {/* Background Image */}
        <Image
          src="/bghome.png"
          alt="My Clinics Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Hero Content */}
        <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 px-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Welcome to My Clinics
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl">
            Manage appointments, prescriptions, billing and medical reports —
            all in one place.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className={cn(
                buttonVariants({
                  size: "lg",
                }),
                "min-w-[140px]"
              )}
            >
              Sign In
            </Link>

            <Link
              href="/clinic"
              className={cn(
                buttonVariants({
                  variant: "secondary",
                  size: "lg",
                }),
                "min-w-[140px]"
              )}
            >
              Go to Clinic
            </Link>
          </div>
        </div>
      </main>

      {/* About Section */}
      <AboutBlock />

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
