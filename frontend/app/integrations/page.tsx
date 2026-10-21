import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plug } from "lucide-react";
import { HeroHeader } from "@/components/hero-section-6-header";
import { FooterSection } from "@/components/footer-section";
import IntegrationsBlock from "@/components/blocks/integrations-4";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Connect My Clinics with WhatsApp, Google Calendar, Razorpay, Tally, Google Drive and Zapier — so your clinic runs without double entry.",
};

export default function IntegrationsPage() {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background text-foreground">
      <HeroHeader />

      <main className="flex-1 pt-20">
        <section className="px-6 pt-12 pb-10 text-center sm:pt-16">
          <div className="mx-auto w-full max-w-3xl">
            <Badge variant="secondary" className="mx-auto">
              <Plug data-icon="inline-start" className="size-3.5" />
              Integrations
            </Badge>
            <h1 className="mt-5 text-balance font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              One clinic, every tool connected
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Keep the apps your team already loves and let them talk to My
              Clinics. Appointments, payments, records and reminders stay in sync
              automatically.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                nativeButton={false}
                render={<Link href="#integrations" />}
              >
                Browse integrations
                <ArrowRight data-icon="inline-end" className="size-4" />
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/#contact" />}
              >
                Request an integration
              </Button>
            </div>
          </div>
        </section>

        <IntegrationsBlock />

        <section className="px-6 py-16">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-muted/40 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                Need something custom?
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Use our API and webhooks to push appointments, patient records
                and billing events into any system your clinic already runs.
              </p>
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/#contact" />}
            >
              Talk to our team
            </Button>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
