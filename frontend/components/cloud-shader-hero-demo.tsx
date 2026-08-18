"use client";

import Link from "next/link";
import { CloudShader } from "@/components/ui/cloud-shader";
import { Button } from "@/components/ui/button";

export default function CloudShaderHeroDemo() {
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
          <img
            src="/logo.png"
            alt="My Clinics logo"
            className="h-8 w-8 rounded-md bg-white object-contain shadow-sm"
          />
          <span className="text-lg font-semibold tracking-tight text-white drop-shadow-sm">
            My Clinics
          </span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-white/90 md:flex">
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
            href="/signup/clinic"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black shadow-md transition hover:bg-white/90"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* hero */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pt-12 text-center md:pt-20">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md md:text-6xl lg:text-7xl">
          Healthcare above the clouds
        </h1>
        <p className="mt-6 max-w-2xl text-base text-black md:text-lg">
          My Clinics gives your clinic one secure home for appointments,
          medical records, prescriptions, billing and reports. One clinic, one
          tenant — your data never mixes with anyone else&apos;s.
        </p>
      </div>

      {/* CTA */}
      <div className="relative z-10 mx-auto mt-12 w-full max-w-4xl px-4 pb-16">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/50 bg-white/60 p-8 text-center shadow-2xl shadow-[#0D47A1]/20 backdrop-blur-xl sm:flex-row sm:justify-center sm:gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-gray-700">
              Already a clinic?
            </span>
            <Button render={<Link href="/login" />} className="w-48">
              Login
            </Button>
          </div>
          <div className="hidden h-16 w-px bg-gray-300 sm:block" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-gray-700">
              New to My Clinics?
            </span>
            <Button
              render={<Link href="/signup/clinic" />}
              variant="outline"
              className="w-48 text-black"
            >
              Create your clinic
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}