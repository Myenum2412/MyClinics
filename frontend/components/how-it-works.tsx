import { Building2, Stethoscope, MessageCircle, LayoutDashboard } from "lucide-react";

const steps = [
  {
    icon: Building2,
    title: "Register your clinic",
    desc: "Create your clinic in under 2 minutes — get your Clinic ID (clc_...), set hours, address and WhatsApp number. No credit card required.",
  },
  {
    icon: Stethoscope,
    title: "Add doctors & services",
    desc: "Add doctors, consultation fees and time slots. My Clinics enables city-filtered booking, patient records and prescriptions instantly.",
  },
  {
    icon: MessageCircle,
    title: "Patients book on WhatsApp",
    desc: "Share your link — patients book, reschedule or cancel on WhatsApp 24/7. Our AI assistant answers from your soul.md, sends reminders and turn alerts.",
  },
  {
    icon: LayoutDashboard,
    title: "Run everything from one dashboard",
    desc: "Manage live queue, billing & GST invoices, prescriptions, R2 reports and audit logs — fully isolated per clinic with role-based access.",
  },
];

export function HowItWorks() {
  return (
    <section className="w-full px-6 py-20" style={{ backgroundColor: "#E3F2FD" }}>
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-widest text-black">HOW IT WORKS</span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-black">Clinic live<br />in four steps</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-black">
            From signup to first appointment in minutes. MyClinics automates your front desk with WhatsApp booking, reminders and live queue — while you stay in control from one dashboard.
          </p>
        </div>
        <div className="relative flex flex-col">
          {steps.map((s, i) => (
            <div key={s.title} className="relative flex gap-4 pb-10 last:pb-0">
              {i < steps.length - 1 && <span className="absolute left-5 top-10 h-full w-px bg-border" aria-hidden />}
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm text-black">
                <s.icon className="size-4 text-black" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-black">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-black">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
