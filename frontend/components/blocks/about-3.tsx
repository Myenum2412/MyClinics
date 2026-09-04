import { HeartPulse, ShieldCheck, MessageCircle, ClipboardCheck, Zap, BadgeCheck } from "lucide-react"

type IconProps = { className?: string; size?: number | string }

const values = [
  {
    icon: (p: IconProps) => <HeartPulse {...p} />,
    title: "Patients first, paperwork second",
    description:
      "Care comes before admin. We handle bookings, reminders and records so doctors and staff can focus on patients, not paperwork.",
    accent: "bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: (p: IconProps) => <ShieldCheck {...p} />,
    title: "Trust is the foundation",
    description:
      "Patient privacy and data security are never compromised. Your clinic's information stays safe, private and always in your control.",
    accent: "bg-[#0D47A1] text-white border-transparent",
  },
  {
    icon: (p: IconProps) => <MessageCircle {...p} />,
    title: "Care where patients are",
    description:
      "Patients prefer WhatsApp — so do we. Bookings, answers and reminders happen where patients already chat, with human support behind it.",
    accent: "bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: (p: IconProps) => <ClipboardCheck {...p} />,
    title: "Built for busy clinics",
    description:
      "Designed for how small clinics actually work — reducing waiting time, missed appointments and phone load without extra effort.",
    accent: "bg-white text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: (p: IconProps) => <Zap {...p} />,
    title: "Simple for everyone",
    description:
      "No complex training needed. Staff and patients can use MyClinics from day one — for appointments, bills or medical history.",
    accent: "bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: (p: IconProps) => <BadgeCheck {...p} />,
    title: "We own every visit",
    description:
      "From first appointment to follow-up care, we ensure every patient journey is smooth, on time and cared for till the end.",
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
            The values that guide MyClinics every day — from how we support clinics to how we
            care for every patient&apos;s experience.
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
            <ShieldCheck className="size-3.5 text-[#0D47A1]" /> Private & secure
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
