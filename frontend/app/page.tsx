import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      {/* Background image */}
      <Image
        src="/bghome.png"
        alt="Background"
        fill
        priority
        className="object-cover"
      />
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-8 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          Welcome to My Clinics
        </h1>
        <p className="max-w-xl text-lg text-white/90">
          Manage appointments, prescriptions, billing and medical reports — all
          in one place.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/clinic">Go to Clinic</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
