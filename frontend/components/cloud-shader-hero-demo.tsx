"use client";

import Link from "next/link";
import { CloudShader } from "@/components/ui/cloud-shader";
import AppointmentForm, {
  type DoctorOption,
} from "@/components/AppointmentForm";

export default function CloudShaderHeroDemo({
  doctors,
}: {
  doctors: DoctorOption[];
}) {
  return (
    <div className="relative min-h-[50rem] w-full overflow-hidden">
      <CloudShader
        className="absolute inset-0"
        skyTopColor="#0D47A1"
        skyBottomColor="#90CAF9"
        cloudColor="#E3F2FD"
      />

      {/* navbar */}
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-sm font-bold text-[#0D47A1] shadow-sm">
            M
          </div>
          <span className="text-lg font-semibold tracking-tight text-white drop-shadow-sm">
            My Clinics
          </span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-white/90 md:flex">
          <a href="#book" className="transition hover:text-white">
            Book Appointment
          </a>
          <a href="/login" className="transition hover:text-white">
            Login
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-white/90 transition hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[#0D47A1] shadow-md transition hover:bg-white/90"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* hero */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pt-12 text-center md:pt-20">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md md:text-6xl lg:text-7xl">
          Healthcare above <br className="hidden md:block" /> the clouds
        </h1>
        <p className="mt-6 max-w-2xl text-base text-black md:text-lg">
          My Clinics gives your clinic one home for appointments, medicines,
          billing and medical reports. Care that works for patients while your
          team sleeps.
        </p>
      </div>

      {/* booking form */}
      <div
        id="book"
        className="relative z-10 mx-auto mt-12 w-full max-w-2xl scroll-mt-24 px-4 pb-16"
      >
        <AppointmentForm doctors={doctors} />
      </div>
    </div>
  );
}