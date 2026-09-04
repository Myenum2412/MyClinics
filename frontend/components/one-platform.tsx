"use client";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  HeartPulse,
  Pill,
  Stethoscope,
  FileText,
  Activity,
  CreditCard,
  ClipboardList,
} from "lucide-react";

function FloatIcon({
  className,
  children,
  variant = "primary",
}: {
  className: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "light";
}) {
  const bg =
    variant === "primary"
      ? "bg-[#0D47A1] text-white"
      : variant === "secondary"
        ? "bg-[#2196F3] text-white"
        : variant === "accent"
          ? "bg-[#90CAF9] text-[#0D47A1]"
          : "bg-white text-[#0D47A1] border border-[#90CAF9]/40";
  return (
    <div
      className={`absolute flex size-11 items-center justify-center rounded-2xl shadow-lg shadow-[#0D47A1]/15 backdrop-blur animate-pulse ${bg} ${className}`}
    >
      {children}
    </div>
  );
}

export function OnePlatform() {
  return (
    <section className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-[#E3F2FD]/45 px-6 py-24">
      {/* soft clinic gradient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_20%_20%,rgba(144,202,249,0.35),transparent_60%),radial-gradient(700px_500px_at_80%_80%,rgba(33,150,243,0.12),transparent_65%)]" />
      <FloatIcon className="left-[5%] top-[20%]" variant="primary">
        <CalendarCheck className="size-5" />
      </FloatIcon>
      <FloatIcon className="left-[25%] top-[5%]" variant="secondary">
        <HeartPulse className="size-5" />
      </FloatIcon>
      <FloatIcon className="right-[25%] top-[10%]" variant="accent">
        <Pill className="size-5" />
      </FloatIcon>
      <FloatIcon className="right-[5%] top-[20%]" variant="primary">
        <Stethoscope className="size-5" />
      </FloatIcon>
      <FloatIcon className="left-[7%] bottom-[20%]" variant="light">
        <FileText className="size-5" />
      </FloatIcon>
      <FloatIcon className="left-[24%] bottom-[5%]" variant="secondary">
        <Activity className="size-5" />
      </FloatIcon>
      <FloatIcon className="right-[25%] bottom-[5%]" variant="primary">
        <CreditCard className="size-5" />
      </FloatIcon>
      <FloatIcon className="right-[7%] bottom-[25%]" variant="light">
        <ClipboardList className="size-5" />
      </FloatIcon>

      <div className="relative z-10 flex max-w-xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#90CAF9]/40 bg-white px-3 py-1 text-xs font-semibold tracking-widest text-[#0D47A1]">
          <span className="size-2 rounded-full bg-[#2196F3] animate-pulse" />
          ONE PLATFORM FOR CLINICS
        </span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0D47A1]">One Platform, Complete Clinic Care</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#0D47A1]/70">
          Appointments, patient records, prescriptions, billing and WhatsApp reminders — all in My Clinics, so your team works from one trusted place.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "bg-[#0D47A1] text-white hover:bg-[#0D47A1]/90 shadow-md")}>
            Start Free Trial <span>›</span>
          </Link>
          <Link href="/signup/clinic" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-[#0D47A1]/20 bg-white text-[#0D47A1] hover:bg-[#E3F2FD]")}>
            Create Clinic
          </Link>
        </div>
        <p className="mt-4 text-xs text-[#0D47A1]/60">
          Trusted by <span className="font-semibold text-[#0D47A1]">500+ clinics</span> • <span className="font-semibold text-[#0D47A1]">WhatsApp + Web</span> booking in one click
        </p>
      </div>
    </section>
  );
}
