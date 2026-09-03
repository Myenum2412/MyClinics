"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const steps = [
  { label: "Sign Up with Google Auth" },
  { label: "Complete the Profile" },
  { label: "Create Doctors & Users" },
  { label: "Add Patients & Users" },
];

export function OnboardingSteps() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrent((c) => (c + 1) % steps.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="flex w-full flex-col items-center bg-background px-6 py-16">
      <h2 className="mb-8 text-2xl font-bold tracking-tight">Get Started in 4 Steps</h2>
      <div className="w-full max-w-2xl">
        <ol className="flex">
          {steps.map((step, i) => {
            const status = i < current ? "done" : i === current ? "current" : "upcoming";
            return (
              <li key={step.label} aria-current={status === "current" ? "step" : undefined} className="relative flex flex-1 flex-col items-center">
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn("absolute top-4 left-1/2 h-0.5 w-full -translate-y-1/2 transition-colors duration-500", status === "done" ? "bg-primary" : "bg-border")}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 flex size-8 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-all duration-500",
                    status === "done" && "bg-primary text-primary-foreground",
                    status === "current" && "border-2 border-primary bg-background text-primary animate-pulse",
                    status === "upcoming" && "border border-border bg-background text-muted-foreground"
                  )}
                >
                  {status === "done" ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={cn("mt-2 text-center text-xs px-1", status === "upcoming" ? "text-muted-foreground" : "font-medium text-foreground")}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
