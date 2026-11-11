"use client";

import React from "react";
import Link from "next/link";
import {
  Zap,
  Cpu,
  Lock,
  Sparkles,
  CheckCheck,
  Clock,
  FileText,
  Send,
  MessageCircle,
  Stethoscope,
  Pill,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Features4() {
  return (
    <section
      id="whatsapp-flow"
      className="relative w-full py-24 bg-black text-white px-6 overflow-hidden border-t border-blue-900/40"
    >
      {/* Background glow effects */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <MessageCircle className="size-3.5 text-emerald-400" />
            WhatsApp Patient Experience
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Smarter clinic operations, instant WhatsApp follow
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/60">
            Keep every patient updated with live queue status, digital prescriptions, and automated follow-ups directly on WhatsApp without installing extra apps.
          </p>
        </div>

        {/* Top Tier: Two Large Hero Feature Panels (Left: Doctor AI Workspace, Right: WhatsApp Follow) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Left Panel: Doctor & Consultation Workspace */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-blue-900/60 bg-blue-950/20 p-6 sm:p-8 backdrop-blur-md transition-all duration-300 hover:border-blue-700/80 hover:shadow-2xl hover:shadow-blue-900/20">
            <div>
              <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-blue-400">
                <Stethoscope className="size-4" />
                Intelligent Doctor Workspace
              </div>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">
                Speed up clinical consultations & smart Rx
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Generate digital prescriptions on your clinic letterhead in seconds with dosage suggestions, investigation orders, and instant patient history.
              </p>
            </div>

            {/* Visual Interactive Mockup */}
            <div className="mt-8 rounded-xl border border-blue-900/50 bg-black/60 p-4 sm:p-5 shadow-inner">
              <div className="flex items-center justify-between border-b border-blue-900/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-300">
                    Dr
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Dr. Ajay V, Orthopedics</p>
                    <p className="text-[10px] text-white/50">Consultation Active · Token #14</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                  Rx Active
                </span>
              </div>

              {/* Medicine items */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-blue-950/40 px-3 py-2 text-xs border border-blue-900/30">
                  <div className="flex items-center gap-2">
                    <Pill className="size-3.5 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">Amoxicillin 500mg</p>
                      <p className="text-[10px] text-white/50">Oral · 1-0-1 · After Food · 5 Days</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-blue-300">Qty: 10</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-blue-950/40 px-3 py-2 text-xs border border-blue-900/30">
                  <div className="flex items-center gap-2">
                    <Pill className="size-3.5 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">Paracetamol 650mg</p>
                      <p className="text-[10px] text-white/50">Oral · 1-0-0 · SOS for fever</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-blue-300">Qty: 5</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-2 border-t border-blue-900/30 text-xs">
                <span className="text-[11px] text-white/50 flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  No drug-drug conflicts detected
                </span>
                <span className="text-[11px] text-blue-400 font-semibold cursor-pointer hover:underline">
                  Sign & Send Rx →
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-white/50">1 tap to print, download, or dispatch</span>
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
              >
                Explore doctor suite <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* Right Panel: WhatsApp Follow & Live Queue (User explicit request) */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-6 sm:p-8 backdrop-blur-md transition-all duration-300 hover:border-emerald-600/80 hover:shadow-2xl hover:shadow-emerald-900/20">
            <div>
              <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                <MessageCircle className="size-4" />
                Right-Side WhatsApp Follow
              </div>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">
                Live queue tracking & automated patient follow-up
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Patients receive instant appointment confirmations, follow their live queue number in real time, and get digital prescription PDFs directly on WhatsApp.
              </p>
            </div>

            {/* Realistic WhatsApp Chat Container */}
            <div className="mt-8 overflow-hidden rounded-xl border border-emerald-900/40 bg-[#0B141A] shadow-2xl">
              {/* WhatsApp App Header */}
              <div className="flex items-center justify-between bg-[#1F2C34] px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="relative size-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                    MC
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1F2C34]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-white">My Clinics Care</p>
                      <svg className="size-3 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                    <p className="text-[10px] text-emerald-400/90">Official Business Account</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">Verified</span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="space-y-3 p-4 text-xs font-normal bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
                {/* Message 1: Appointment Confirmation */}
                <div className="max-w-[85%] rounded-lg bg-[#005C4B] p-2.5 text-white shadow-sm">
                  <p className="font-semibold text-[11px] text-emerald-300">Appointment Confirmed! 🎉</p>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Hello Rahul, your visit with <span className="font-semibold">Dr. Ajay V</span> is confirmed for today at 4:30 PM.
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-emerald-200/80">
                    <span>Token: #14</span>
                    <span className="flex items-center gap-0.5">
                      4:15 PM <CheckCheck className="size-3 text-emerald-400" />
                    </span>
                  </div>
                </div>

                {/* Message 2: Live Queue Follow Alert */}
                <div className="max-w-[85%] rounded-lg bg-[#005C4B] p-2.5 text-white shadow-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px] text-emerald-300">
                    <Clock className="size-3" />
                    <span>Live Queue Follow</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    2 patients ahead of you. Estimated wait: ~8 mins.
                  </p>
                  <div className="mt-2 rounded bg-black/20 p-1.5 text-center text-[10px] font-semibold text-emerald-300">
                    👉 Live Status: Token #12 is in consultation
                  </div>
                  <div className="mt-1 flex justify-end text-[10px] text-emerald-200/80">
                    <span className="flex items-center gap-0.5">
                      4:22 PM <CheckCheck className="size-3 text-emerald-400" />
                    </span>
                  </div>
                </div>

                {/* Message 3: Digital Prescription Delivered */}
                <div className="max-w-[85%] rounded-lg bg-[#005C4B] p-2.5 text-white shadow-sm">
                  <div className="flex items-center gap-2 rounded bg-black/20 p-2">
                    <FileText className="size-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold">Prescription_Rahul.pdf</p>
                      <p className="text-[9px] text-white/60">124 KB · Signed by Dr. Ajay V</p>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-emerald-200/90">
                    Next follow-up: 5 days. Reply anytime for support!
                  </p>
                  <div className="mt-1 flex justify-end text-[10px] text-emerald-200/80">
                    <span className="flex items-center gap-0.5">
                      4:45 PM <CheckCheck className="size-3 text-emerald-400" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="flex items-center gap-2 bg-[#1F2C34] px-3 py-2 text-xs">
                <span className="text-white/40 text-[11px] flex-1">Patient replies here...</span>
                <Send className="size-3.5 text-emerald-400" />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-white/50">Zero app download required for patients</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                100% WhatsApp Native <CheckCheck className="size-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Tier: 4 Secondary Platform Traits (Matching @tailark/features-4 specs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-12 border-t border-white/10">
          {/* Trait 1: Zap (Faaast queues & delivery) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/40 hover:bg-white/[0.04]">
            <div className="flex size-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Zap className="size-5" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-white">Instant Notifications</h4>
            <p className="mt-2 text-xs sm:text-sm text-white/60 leading-relaxed">
              Sub-second WhatsApp delivery for appointment booking, queue token calls, and doctor delay alerts.
            </p>
          </div>

          {/* Trait 2: Cpu (Power & automation) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/40 hover:bg-white/[0.04]">
            <div className="flex size-10 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Cpu className="size-5" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-white">No-Show Reduction</h4>
            <p className="mt-2 text-xs sm:text-sm text-white/60 leading-relaxed">
              Automated 24h & 2h WhatsApp reminders with 1-click confirmation reduce patient no-shows by up to 42%.
            </p>
          </div>

          {/* Trait 3: Lock (Security & compliance) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/40 hover:bg-white/[0.04]">
            <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Lock className="size-5" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-white">Consent & Privacy Safe</h4>
            <p className="mt-2 text-xs sm:text-sm text-white/60 leading-relaxed">
              End-to-end encrypted messaging, automated opt-in compliance, and secure time-limited prescription links.
            </p>
          </div>

          {/* Trait 4: Sparkles (AI-Powered recovery follow-up) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/40 hover:bg-white/[0.04]">
            <div className="flex size-10 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">
              <Sparkles className="size-5" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-white">AI Post-Visit Follow-up</h4>
            <p className="mt-2 text-xs sm:text-sm text-white/60 leading-relaxed">
              Automated check-ins ask how the patient is recovering 48 hours post-visit and flag concerns directly to the doctor.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Features4;
