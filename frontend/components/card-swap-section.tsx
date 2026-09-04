"use client";

import Link from "next/link";
import {
  CalendarCheck,
  FileText,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  Clock3,
} from "lucide-react";

import { CardSwap } from "@/components/ui/card-swap";
import { Button } from "@/components/ui/button";

export function CardSwapSection() {
  const cards = [
    {
      content: (
        <div className="flex h-full flex-col justify-between p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/20">
              <CalendarCheck className="size-5 text-white" />
            </span>
            <span className="text-xs font-medium tracking-widest text-white/80 uppercase">
              Appointments
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold leading-tight text-white">
              Book in 30 seconds
            </h3>
            <p className="text-sm leading-relaxed text-white/85">
              WhatsApp + web booking with city-filtered doctors and instant
              confirmation.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-white/90">
            <Clock3 className="size-3.5" /> No phone queue • 24/7
          </div>
        </div>
      ),
      className: "bg-gradient-to-br from-[#2196F3] to-[#0D47A1] border-white/20",
    },
    {
      content: (
        <div className="flex h-full flex-col justify-between p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#E3F2FD]">
              <FileText className="size-5 text-[#0D47A1]" />
            </span>
            <span className="text-xs font-medium tracking-widest text-slate-500 uppercase">
              Health Records
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold leading-tight text-slate-900">
              All records, one place
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              Prescriptions, lab reports & visit history — encrypted and
              clinic-isolated.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#2196F3]">
            <ShieldCheck className="size-3.5" /> End-to-end secure
          </div>
        </div>
      ),
      className: "bg-white border-slate-200",
    },
    {
      content: (
        <div className="flex h-full flex-col justify-between p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#0D47A1]">
              <Receipt className="size-5 text-white" />
            </span>
            <span className="text-xs font-medium tracking-widest text-[#0D47A1]/70 uppercase">
              Billing
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold leading-tight text-slate-900">
              Transparent billing
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              Itemised invoices, payment tracking and downloadable receipts
              instantly.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0D47A1] px-3 py-1 text-xs font-semibold text-white">
            No hidden fees
          </div>
        </div>
      ),
      className: "bg-[#E3F2FD] border-white",
    },
  ];

  return (
    <section className="relative overflow-hidden border-y bg-[#0D47A1] py-12 md:py-20">
      {/* Separate background layers — distinct from rest of page */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 300px at 20% 20%, rgba(144,202,249,0.25), transparent 60%), radial-gradient(800px 400px at 90% 90%, rgba(255,255,255,0.08), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
      />
      {/* subtle grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-2 md:gap-8 md:px-6">
        {/* Left copy */}
        <div className="order-2 flex flex-col gap-5 md:order-1">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <span className="size-2 rounded-full bg-[#90CAF9] animate-pulse" />
            Live preview — auto-cycles every 5s
          </div>
          <h2 className="font-heading text-3xl font-bold leading-tight text-white md:text-4xl">
            Everything your clinic
            <span className="block text-[#90CAF9]">needs, stacked.</span>
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
            Three cards, one stack — appointments, records and billing. The
            <span className="font-semibold text-white"> Card Swap</span> animation
            cycles them with a skewed perspective (GSAP) so patients instantly
            see the value.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-white/85">
            <li className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-white/15">
                <CalendarCheck className="size-3" />
              </span>
              WhatsApp-assisted booking that never sleeps
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-white/15">
                <ShieldCheck className="size-3" />
              </span>
              Bank-grade isolation — your clinic&apos;s data stays yours
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-white/15">
                <Receipt className="size-3" />
              </span>
              Billing & reports without spreadsheets
            </li>
          </ul>
          <div className="flex items-center gap-3 pt-2">
            <Button
              render={<Link href="/signup/clinic" />}
              nativeButton={false}
              className="bg-white text-[#0D47A1] hover:bg-white/90"
            >
              Start free <ArrowUpRight data-icon="inline-end" className="size-4" />
            </Button>
            <Button
              variant="outline"
              render={<Link href="/login" />}
              nativeButton={false}
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              View demo
            </Button>
          </div>
          <p className="text-xs text-white/60">
            Separate background colour (#0D47A1) isolates this interactive section from
            the rest of the landing page.
          </p>
        </div>

        {/* Right — CardSwap visual */}
        <div className="order-1 relative flex h-[340px] items-center justify-center overflow-visible md:order-2 md:h-[480px]">
          {/* subtle glow behind stack */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[320px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2196F3]/30 blur-[60px]"
          />
          <div className="relative h-full w-full max-w-[560px]">
            <CardSwap
              cards={cards}
              width={360}
              height={240}
              cardDistance={42}
              verticalDistance={54}
              delay={3600}
              skewAmount={5.5}
              easing="elastic"
              pauseOnHover
            />
          </div>
        </div>
      </div>
    </section>
  );
}
