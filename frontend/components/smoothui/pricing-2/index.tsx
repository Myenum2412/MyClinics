"use client";

import { cn } from "@/lib/utils";
import SmoothButton from "@/components/smoothui/smooth-button";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useState } from "react";
import Link from "next/link";

const CARD_ANIMATION_DELAY = 0.1;

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function PriceINR({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline font-semibold", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -12, opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {formatINR(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function PricingModern() {
  const shouldReduceMotion = useReducedMotion();
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      tagline: "Perfect for single clinic",
      monthly: 7000,
      yearly: 70000,
      yearlyNote: "₹70,000 billed yearly",
      description:
        "Essential for solo practices. Get started with core clinic operations and WhatsApp booking.",
      cta: "Get Started",
      href: "/signup/clinic",
      features: [
        "1 Clinic",
        "Up to 6 Doctors",
        "1,000 Patients",
        "Appointment & WhatsApp booking",
        "Billing & Invoices",
        "Email Support",
      ],
      featured: false,
    },
    {
      name: "Growth",
      tagline: "Best for growing teams",
      monthly: 12000,
      yearly: 120000,
      yearlyNote: "₹1,20,000 billed yearly",
      description:
        "Advanced for multi-location clinics. Scale with analytics, team tools and priority support.",
      cta: "Start Growth Plan",
      href: "/signup/clinic",
      features: [
        "Up to 3 Clinics",
        "15 Doctors",
        "Unlimited Patients",
        "Advanced Analytics",
        "Team Collaboration",
        "Priority Support",
        "Custom Integrations",
      ],
      featured: true,
    },
    {
      name: "Scale",
      tagline: "Tailored for enterprises",
      monthly: 20000,
      yearly: 200000,
      yearlyNote: "₹2,00,000 billed yearly",
      description:
        "Custom for hospital chains. Dedicated success, SLA and on-prem options for large orgs.",
      cta: "Contact Sales",
      href: "/contact",
      features: [
        "Unlimited Clinics",
        "Unlimited Doctors",
        "Dedicated Manager",
        "SLA & 24/7 Phone Support",
        "On-premise Options",
        "Advanced Security",
        "Training & Onboarding",
      ],
      featured: false,
    },
  ];

  return (
    <section id="pricing">
      <div className="relative bg-muted/50 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Indian pricing • GST extra • Starts at ₹7,000/mo
            </div>
            <h2 className="mt-4 text-balance font-bold text-3xl md:text-4xl lg:text-5xl lg:tracking-tight">
              Simple pricing for every clinic
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-balance text-foreground/70 text-lg">
              Pick monthly for flexibility or yearly for 2 months free. All plans
              include secure, multi-tenant isolation  your data stays yours.
            </p>
            <div className="my-10 flex flex-col items-center gap-3">
              <div
                className="relative mx-auto grid w-fit grid-cols-2 rounded-full border bg-background p-1 *:block *:h-8 *:w-28 *:rounded-full *:text-foreground *:text-sm *:hover:opacity-75"
                data-period={isAnnual ? "annually" : "monthly"}
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-1 w-1/2 rounded-full border border-transparent bg-[#0D47A1] shadow ring-1 ring-foreground/5 transition-transform duration-500 ease-in-out ${
                    isAnnual ? "translate-x-full" : "translate-x-0"
                  }`}
                />
                <button
                  className="relative duration-500 data-[active=true]:font-medium data-[active=true]:text-white"
                  data-active={!isAnnual}
                  onClick={() => setIsAnnual(false)}
                  type="button"
                >
                  Monthly
                </button>
                <button
                  className="relative duration-500 data-[active=true]:font-medium data-[active=true]:text-white"
                  data-active={isAnnual}
                  onClick={() => setIsAnnual(true)}
                  type="button"
                >
                  Yearly
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAnnual ? (
                  <span className="font-medium text-emerald-600">
                    Save ~17% on yearly • 2 months free
                  </span>
                ) : (
                  "Billed monthly • Cancel anytime"
                )}
              </p>
            </div>
          </div>

          <div className="container">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-1 gap-6 *:p-8 md:grid-cols-3">
                {plans.map((plan, idx) => (
                  <motion.div
                    key={plan.name}
                    animate={
                      shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
                    }
                    className={cn(
                      "group relative flex h-[640px] flex-col overflow-hidden rounded-2xl border p-8",
                      plan.featured
                        ? "bg-[#0D47A1] text-white border-[#0D47A1] shadow-xl"
                        : "bg-background"
                    )}
                    data-animate-card
                    initial={
                      shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 40 }
                    }
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            delay: CARD_ANIMATION_DELAY * idx,
                            duration: 0.3,
                            ease: [0.22, 1, 0.36, 1],
                          }
                    }
                  >
                    {plan.featured && (
                      <div className="gradient-accent absolute top-0 right-0 h-4 w-32 rounded-bl-2xl bg-gradient-to-r from-[#2196F3] via-[#90CAF9] to-white" />
                    )}

                    <div className="card-content relative z-10 flex h-full flex-col">
                      <h3
                        className={cn(
                          "mb-1 flex items-center gap-2 font-bold text-2xl",
                          plan.featured ? "text-white" : "text-foreground"
                        )}
                      >
                        {plan.name}
                        {plan.featured && (
                          <span className="rounded-full bg-white px-2 py-1 font-bold text-[#0D47A1] text-xs">
                            Most Popular
                          </span>
                        )}
                      </h3>
                      <p
                        className={cn(
                          "mb-4 text-sm",
                          plan.featured ? "text-white/70" : "text-foreground/70"
                        )}
                      >
                        {plan.tagline}
                      </p>

                      <div className="mb-1 flex items-baseline gap-1">
                        <span
                          className={cn(
                            "font-bold text-3xl tracking-tight",
                            plan.featured ? "text-white" : "text-foreground"
                          )}
                        >
                          <PriceINR
                            value={isAnnual ? plan.yearly : plan.monthly}
                          />
                        </span>
                        <span
                          className={cn(
                            "text-sm font-normal",
                            plan.featured ? "text-white/70" : "text-foreground/70"
                          )}
                        >
                          /{isAnnual ? "year" : "month"}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mb-5 text-xs",
                          plan.featured ? "text-white/60" : "text-muted-foreground"
                        )}
                      >
                        {isAnnual
                          ? `${plan.yearlyNote} • ${formatINR(
                              Math.round(
                                (isAnnual ? plan.yearly : plan.monthly) /
                                  (isAnnual ? 12 : 1)
                              )
                            )}/mo effective`
                          : "Billed monthly • GST extra"}
                      </p>

                      <SmoothButton
                        asChild
                        className="mb-6 w-full"
                        variant={plan.featured ? "candy" : "outline"}
                      >
                        <Link href={plan.href} className="w-full block text-center">
                          {plan.cta}
                        </Link>
                      </SmoothButton>

                      <p
                        className={cn(
                          "mb-6 text-sm leading-relaxed",
                          plan.featured ? "text-white/75" : "text-foreground/70"
                        )}
                      >
                        {plan.description}
                      </p>

                      <div className="space-y-4">
                        <h4
                          className={cn(
                            "font-medium text-xs uppercase tracking-wider",
                            plan.featured ? "text-white/60" : "text-foreground/70"
                          )}
                        >
                          What&apos;s included:
                        </h4>
                        <ul className="space-y-3">
                          {plan.features.map((item) => (
                            <li
                              className={cn(
                                "flex items-center gap-3 text-sm",
                                plan.featured ? "text-white" : "text-foreground"
                              )}
                              key={item}
                            >
                              <div
                                className={cn(
                                  "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full",
                                  plan.featured ? "bg-white" : "bg-foreground"
                                )}
                              >
                                <svg
                                  aria-hidden="true"
                                  className={cn(
                                    "h-2 w-2",
                                    plan.featured ? "text-[#0D47A1]" : "text-background"
                                  )}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    clipRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    fillRule="evenodd"
                                  />
                                </svg>
                              </div>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p className="mt-8 text-center text-xs text-muted-foreground">
                All prices in INR • GST extra • Yearly = 12 months for price of 10 • Need custom?{" "}
                <Link href="/contact" className="underline hover:text-foreground">
                  Talk to sales
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PricingModern;
