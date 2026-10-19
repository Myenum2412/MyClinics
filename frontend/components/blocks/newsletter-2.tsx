"use client"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ArrowRight, Lock } from "lucide-react"

export default function NewsletterBlock() {
  return (
    <section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-5xl rounded-xl bg-muted px-8 py-10 sm:px-12 sm:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-16">
          <div className="flex flex-col gap-3 md:max-w-sm">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Partner Newsletter
            </p>
            <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
              Partner insights, delivered monthly
            </h2>
            <p className="text-sm text-muted-foreground">
              Product updates, growth tips and practical guides from the My
              Clinics team, landing in your inbox every month.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:max-w-md md:min-w-0 md:flex-1">
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                toast.success("You're subscribed. Talk soon!")
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="work@company.com"
                  aria-label="Email address"
                  className="flex-1 border-border bg-background"
                />
                <Button type="submit" className="shrink-0">
                  Subscribe
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="newsletter-consent" name="consent" />
                <label
                  htmlFor="newsletter-consent"
                  className="text-sm font-normal text-muted-foreground"
                >
                  I agree to receive the My Clinics partner newsletter.
                </label>
              </div>
            </form>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock aria-hidden="true" className="shrink-0" size={12} />
              Your data stays private. Unsubscribe any time, no questions asked.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
