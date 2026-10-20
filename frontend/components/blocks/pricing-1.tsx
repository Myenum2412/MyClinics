"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

type Tier = {
  name: string
  monthly: number | null
  annual: number | null
  description: string
  features: string[]
  cta: string
  href: string
  featured: boolean
}

const tiers: Tier[] = [
  {
    name: "Starter",
    monthly: 2_500,
    annual: 30_000,
    description: "For a solo doctor running a single clinic.",
    features: [
      "1 doctor, 1 clinic location",
      "Unlimited appointments & live queue",
      "Patient records & digital prescriptions",
      "GST-ready billing and receipts",
      "WhatsApp appointment reminders",
      "Email support",
    ],
    cta: "Get started",
    href: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    monthly: 5_000,
    annual: 60_000,
    description: "For growing clinics with a reception and pharmacy team.",
    features: [
      "Up to 5 doctors",
      "Everything in Starter",
      "Pharmacy & inventory management",
      "Patient timeline and visit history",
      "Appointment and revenue analytics",
      "AI assistant and smart follow-ups",
      "Priority WhatsApp support",
    ],
    cta: "Get started",
    href: "/signup",
    featured: true,
  },
  {
    name: "Enterprise",
    monthly: null,
    annual: null,
    description: "For multi-clinic chains and hospital groups.",
    features: [
      "Unlimited doctors and branches",
      "Everything in Pro",
      "Multi-branch dashboards and reports",
      "Role-based access and audit logs",
      "Data migration and staff onboarding",
      "Dedicated account manager",
    ],
    cta: "Contact sales",
    href: "/signup",
    featured: false,
  },
]

type Billing = "monthly" | "annual"

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

export default function PricingBlock() {
  const [billing, setBilling] = React.useState<Billing>("monthly")

  return (
    <section className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Pricing that grows with your clinic
          </h2>
          <p className="mt-3 text-muted-foreground">
            One clinic or a whole group — pick a plan, with no setup fees and no
            per-patient charges.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              aria-pressed={billing === "monthly"}
              className={cn(
                "px-4 py-1.5 text-sm font-medium transition-colors",
                billing === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              aria-pressed={billing === "annual"}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-sm font-medium transition-colors",
                billing === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {tiers.map((tier) => {
            const amount = billing === "annual" ? tier.annual : tier.monthly
            const period = billing === "annual" ? "year" : "month"

            return (
              <Card
                key={tier.name}
                className={cn(tier.featured && "bg-muted/30 ring-2 ring-primary")}
              >
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    {tier.name}
                  </CardTitle>
                  {tier.featured && (
                    <CardAction>
                      <Badge>Most Popular</Badge>
                    </CardAction>
                  )}
                  <CardDescription className="text-sm sm:min-h-10">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-6">
                  <div>
                    <p className="flex flex-wrap items-baseline gap-x-1">
                      <span className="text-4xl font-bold tracking-tight text-foreground">
                        {amount === null ? "Custom" : inr.format(amount)}
                      </span>
                      {amount !== null && (
                        <span className="text-sm text-muted-foreground">
                          /{period}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tier.monthly === null || tier.annual === null
                        ? "Quoted for your branches and patient volume"
                        : billing === "annual"
                          ? `${inr.format(Math.round(tier.annual / 12))}/month, billed yearly`
                          : `${inr.format(tier.annual)} per year`}
                    </p>
                  </div>
                  <ul className="flex flex-1 flex-col gap-3 text-sm text-foreground">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    nativeButton={false}
                    variant={tier.featured ? "default" : "outline"}
                    size="lg"
                    className="w-full active:scale-[0.97] transition-transform duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
                    render={<a href={tier.href} />}
                  >
                    {tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
