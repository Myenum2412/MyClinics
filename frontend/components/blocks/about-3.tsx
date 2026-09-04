import { HeartPulse, ShieldCheck, MessageCircle, ClipboardCheck, Zap, BadgeCheck } from "lucide-react"

type IconProps = { className?: string; size?: number | string }

const values = [
  {
    icon: (p: IconProps) => <HeartPulse {...p} />,
    title: "Patients first, paperwork second",
    description:
      "We automate booking, reminders and billing so doctors focus on care — not admin. Every feature is measured by minutes saved at the front desk.",
    accent: "bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: (p: IconProps) => <ShieldCheck {...p} />,
    title: "Privacy is the foundation",
    description:
      "Tenant-isolated by clinicId, RBAC (clinic_admin → staff → patient), audit logs and encrypted R2 storage. Your clinic's data never leaves your clinic.",
    accent: "bg-[#0D47A1] text-white border-transparent",
  },
  {
    icon: (p: IconProps) => <MessageCircle {...p} />,
    title: "WhatsApp-first, human always",
    description:
      "Patients live on WhatsApp. Our AI books, reschedules and answers 24/7 — grounded strictly in your soul.md + knowledge base, never hallucinating.",
    accent: "bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: (p: IconProps) => <ClipboardCheck {...p} />,
    title: "Built for the front desk",
    description:
      "We shadow reception before we ship. If it doesn't cut no-shows, queues or phone load, we don't build it. Live counters and turn alerts included.",
    accent: "bg-white text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: (p: IconProps) => <Zap {...p} />,
    title: "Simple staff can run",
    description:
      "Clinic live in minutes, usable without training. One-click prescriptions, GST-ready invoices and a queue anyone can understand on day one.",
    accent: "bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: (p: IconProps) => <BadgeCheck {...p} />,
    title: "Own every outcome",
    description:
      "We ship results, not tasks. Reminders sent, queues renumbered, audit trails written — and we stand behind every automated WhatsApp message.",
    accent: "bg-[#0D47A1] text-white border-transparent",
  },
]

export default function AboutBlock() {
  return (
    <section className="relative flex w-full items-center justify-center overflow-hidden bg-[#F8FBFF] px-6 py-20">
      {/* soft clinic background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 400px at 15% 10%, rgba(144,202,249,0.18), transparent 60%), radial-gradient(600px 400px at 90% 85%, rgba(33,150,243,0.08), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#90CAF9]/30 bg-white px-3 py-1 text-xs font-semibold tracking-widest text-[#0D47A1] shadow-sm">
            <span className="size-2 rounded-full bg-[#2196F3] animate-pulse" />
            WHY MYCLINICS
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-[#0D47A1] sm:text-4xl">
            Care is the system — <span className="text-[#2196F3]">not the paperwork</span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#0D47A1]/70">
            Principles we use in every review, hire and hard tradeoff — from WhatsApp booking to
            billing. Built for how small clinics actually run, not how decks say they should.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {values.map(({ icon: Icon, title, description, accent }) => (
            <div
              key={title}
              className="group relative flex flex-col gap-4 rounded-2xl border border-[#E3F2FD] bg-white p-6 shadow-[0_4px_20px_rgba(13,71,161,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(13,71,161,0.12)] hover:border-[#90CAF9]/50"
            >
              {/* subtle top accent line on hover */}
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#90CAF9]/0 to-transparent group-hover:via-[#90CAF9]/40 transition-colors" />

              <span
                className={`flex size-10 items-center justify-center rounded-xl border shadow-sm ${accent}`}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <div className="flex flex-1 flex-col gap-2">
                <h3 className="font-heading text-[15px] font-semibold leading-tight tracking-tight text-[#0D47A1]">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-[#0D47A1]/70">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-medium text-[#0D47A1]/60">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 border border-[#E3F2FD] shadow-sm">
            <ShieldCheck className="size-3.5 text-[#0D47A1]" /> Tenant-isolated & audited
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 border border-[#E3F2FD] shadow-sm">
            <MessageCircle className="size-3.5 text-[#2196F3]" /> WhatsApp + Web booking
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 border border-[#E3F2FD] shadow-sm">
            <HeartPulse className="size-3.5 text-[#0D47A1]" /> Trusted by 500+ clinics
          </span>
        </div>
      </div>
    </section>
  )
}
