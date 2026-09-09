import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation — My Clinics",
  description: "Guides and documentation for My Clinics — book appointments, manage your clinic, and use WhatsApp booking.",
};

const sections = [
  {
    title: "Getting Started",
    items: [
      { title: "Create your clinic account", desc: "Sign up, set up your clinic profile, and invite staff." },
      { title: "Book an appointment (patients)", desc: "Search doctors, pick a slot, and confirm — online or via WhatsApp." },
      { title: "WhatsApp booking", desc: "Message the clinic on WhatsApp and let the AI assistant book for you." },
    ],
  },
  {
    title: "For Clinics",
    items: [
      { title: "Appointments & Queue", desc: "Manage daily schedule, token queue, reschedule and reminders." },
      { title: "Patients & Records", desc: "Centralized patient profiles, medical records, and file uploads." },
      { title: "Billing & Pharmacy", desc: "Generate bills, manage inventory, purchases and sales." },
      { title: "Reports", desc: "Track revenue, appointments, and clinic performance." },
    ],
  },
  {
    title: "For Patients",
    items: [
      { title: "Your dashboard", desc: "View upcoming appointments, prescriptions, and bills in one place." },
      { title: "Medical records", desc: "Access prescriptions, lab reports, and visit history anytime." },
      { title: "Support", desc: "Contact your clinic or email support@myclinics.in for help." },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Everything you need to use My Clinics — whether you&apos;re a patient booking care or a clinic running operations.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">{s.title}</h2>
                <ul className="mt-4 space-y-4">
                  {s.items.map((it) => (
                    <li key={it.title} className="rounded-lg border p-4">
                      <h3 className="font-medium text-sm">{it.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-lg border bg-muted/30 p-6">
            <h2 className="font-semibold">Need help?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Contact us at <a href="mailto:support@myclinics.in" className="underline">support@myclinics.in</a> or visit <Link href="/#contact" className="underline">Contact</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
