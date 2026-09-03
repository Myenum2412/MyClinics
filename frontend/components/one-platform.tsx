"use client";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap, Layers, Triangle, Palette } from "lucide-react";

function FloatIcon({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div className={`absolute flex size-10 items-center justify-center rounded-xl bg-[#1a1a1a] text-white shadow-lg animate-pulse ${className}`}>
      {children}
    </div>
  );
}

export function OnePlatform() {
  return (
    <section className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-white px-6 py-24">
      <FloatIcon className="left-[5%] top-[20%]"><Layers className="size-5" /></FloatIcon>
      <FloatIcon className="left-[25%] top-[5%]"><Zap className="size-5" /></FloatIcon>
      <FloatIcon className="right-[25%] top-[10%]"><Palette className="size-5" /></FloatIcon>
      <FloatIcon className="right-[5%] top-[20%]"><Triangle className="size-5 fill-current" /></FloatIcon>
      <FloatIcon className="left-[7%] bottom-[20%]"><Palette className="size-5" /></FloatIcon>
      <FloatIcon className="left-[24%] bottom-[5%]"><Palette className="size-5" /></FloatIcon>
      <FloatIcon className="right-[25%] bottom-[5%]"><Layers className="size-5" /></FloatIcon>
      <FloatIcon className="right-[7%] bottom-[25%]"><Zap className="size-5" /></FloatIcon>

      <div className="relative z-10 flex max-w-xl flex-col items-center text-center">
        <h2 className="text-3xl font-bold tracking-tight text-black">One Platform, All Your Tools</h2>
        <p className="mt-3 text-sm leading-relaxed text-black/60">My Clinics plugs into the apps your team already runs, so nothing changes but the speed you ship at.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "bg-black text-white hover:bg-black/80")}>Start Free Trial <span>›</span></Link>
          <Link href="#integrations" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>Browse Integrations</Link>
        </div>
        <p className="mt-4 text-xs text-black/50">Connect <span className="font-semibold text-black">50+ tools</span> in <span className="font-semibold text-black">one click</span>. No setup required.</p>
      </div>
    </section>
  );
}
