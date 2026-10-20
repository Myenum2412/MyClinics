"use client"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ArrowRight, Lock } from "lucide-react"

export default function NewsletterHomeBlock() {
  return (
    <section className="relative w-full bg-blue-950 px-6 py-20 text-white">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-blue-900/40 px-6 py-12 ring-1 ring-blue-800 sm:px-12 sm:py-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-16">
          <div className="flex flex-col gap-3 md:max-w-sm">
            <p className="text-sm font-medium tracking-widest text-blue-400 uppercase">
              Clinic Newsletter
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Clinic growth, delivered monthly
            </h2>
            <p className="text-sm text-white/60">
              Product updates, growth tips and practical playbooks from the My
              Clinics team, landing in your inbox every month.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:min-w-0 md:max-w-md md:flex-1">
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
                  required
                  placeholder="work@company.com"
                  aria-label="Email address"
                  className="flex-1 border-blue-800 bg-black text-white placeholder:text-white/40 focus-visible:border-blue-500 focus-visible:ring-blue-500/40"
                />
                <Button
                  type="submit"
                  className="h-10 shrink-0 bg-blue-600 px-4 text-white hover:bg-blue-500"
                >
                  Subscribe
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="newsletter-consent-home"
                  name="consent"
                  className="border-blue-700 bg-blue-950/60 data-checked:border-blue-500 data-checked:bg-blue-500"
                />
                <label
                  htmlFor="newsletter-consent-home"
                  className="text-sm font-normal text-white/70"
                >
                  I agree to receive the My Clinics newsletter.
                </label>
              </div>
            </form>
            <p className="flex items-center gap-1.5 text-xs text-white/50">
              <Lock aria-hidden="true" className="shrink-0" size={12} />
              Your data stays private. Unsubscribe any time, no questions
              asked.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
