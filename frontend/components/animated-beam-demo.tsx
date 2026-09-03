"use client";
import { forwardRef, useRef } from "react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { Calendar, FileText, Pill, Stethoscope, CreditCard, ClipboardList } from "lucide-react";

const Circle = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <div ref={ref} className={`flex size-12 items-center justify-center rounded-full border bg-white shadow-md ${className ?? ""}`}>
      {children}
    </div>
  )
);
Circle.displayName = "Circle";

export function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const ref4 = useRef<HTMLDivElement>(null);
  const ref5 = useRef<HTMLDivElement>(null);
  const ref6 = useRef<HTMLDivElement>(null);

  return (
    <section className="flex w-full flex-col items-center bg-background px-6 py-16">
      <div ref={containerRef} className="relative flex w-full max-w-3xl items-center justify-center py-16">
        {/* Left icons */}
        <div className="flex flex-col gap-10">
          <Circle ref={ref1}><Calendar className="size-5" /></Circle>
          <Circle ref={ref2}><Pill className="size-5" /></Circle>
          <Circle ref={ref3}><FileText className="size-5" /></Circle>
        </div>

        {/* Center card */}
        <div ref={centerRef} className="z-10 mx-8 flex max-w-[280px] flex-col gap-2 rounded-xl border bg-card p-6 text-center shadow-lg">
          <h3 className="text-base font-bold leading-tight">One Platform,<br />One Workflow</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            My Clinics plugs into the apps your team already runs, so nothing changes but the speed you ship at.
          </p>
        </div>

        {/* Right icons */}
        <div className="flex flex-col gap-10">
          <Circle ref={ref4}><Stethoscope className="size-5" /></Circle>
          <Circle ref={ref5}><CreditCard className="size-5" /></Circle>
          <Circle ref={ref6}><ClipboardList className="size-5" /></Circle>
        </div>

        <AnimatedBeam containerRef={containerRef} fromRef={ref1} toRef={centerRef} curvature={-40} />
        <AnimatedBeam containerRef={containerRef} fromRef={ref2} toRef={centerRef} curvature={0} />
        <AnimatedBeam containerRef={containerRef} fromRef={ref3} toRef={centerRef} curvature={40} />
        <AnimatedBeam containerRef={containerRef} fromRef={ref4} toRef={centerRef} curvature={40} reverse />
        <AnimatedBeam containerRef={containerRef} fromRef={ref5} toRef={centerRef} curvature={0} reverse />
        <AnimatedBeam containerRef={containerRef} fromRef={ref6} toRef={centerRef} curvature={-40} reverse />
      </div>
    </section>
  );
}
