import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-16">
        <Image src="/bghome.png" alt="Background" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Welcome to My Clinics
          </h1>
          <p className="max-w-xl text-lg text-white/90">
            Manage appointments, prescriptions, billing and medical reports — all in one place.
          </p>
          <div className="flex gap-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Sign In
            </Link>
            <Link href="/clinic" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
              Go to Clinic
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
