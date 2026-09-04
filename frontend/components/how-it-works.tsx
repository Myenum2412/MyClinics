import { Building2, Stethoscope, MessageCircle, LayoutDashboard } from "lucide-react"

const steps = [
  {
    icon: Building2,
    number: "01",
    title: "Register your clinic",
    desc: "Set up your clinic profile in under 2 minutes — add your address, working hours and contact details. No credit card needed.",
  },
  {
    icon: Stethoscope,
    number: "02",
    title: "Add doctors & services",
    desc: "Add your doctors and services. Patients can instantly find the right doctor, view fees and see available timings.",
  },
  {
    icon: MessageCircle,
    number: "03",
    title: "Patients book in seconds",
    desc: "Share your booking link. Patients book, reschedule or cancel on WhatsApp or web — with automatic reminders and queue updates.",
  },
  {
    icon: LayoutDashboard,
    number: "04",
    title: "Manage care from one place",
    desc: "Run your entire clinic from one dashboard — appointments, patient records, billing and reports, all in one trusted place.",
  },
]

export function HowItWorks() {
  return (
    <section className="relative w-full overflow-hidden bg-white px-6 py-20">
      {/* premium soft gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 400px at 10% 15%, rgba(227,242,253,0.9), transparent 60%), radial-gradient(600px 400px at 90% 85%, rgba(144,202,249,0.18), transparent 60%)",
        }}
      />
      {/* subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #0D47A1 1px, transparent 1px), linear-gradient(to bottom, #0D47A1 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:gap-16">
        {/* Left — sticky intro */}
        <div className="relative md:sticky md:top-24 md:self-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#90CAF9]/30 bg-[#E3F2FD]/60 px-3 py-1 text-xs font-semibold tracking-widest text-[#0D47A1] backdrop-blur">
            <span className="size-2 rounded-full bg-[#2196F3] animate-pulse" />
            HOW IT WORKS
          </span>
          <h2 className="mt-4 font-heading text-4xl font-bold tracking-tight text-[#0D47A1] leading-[1.05]">
            Clinic live
            <br />
            <span className="bg-gradient-to-r from-[#0D47A1] to-[#2196F3] bg-clip-text text-transparent">
              in four steps
            </span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[#0D47A1]/70">
            From signup to first appointment in minutes. MyClinics gives you a simple, trusted
            flow — patients book easily, your team stays in control.
          </p>

          <div className="mt-6 hidden gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-[#E3F2FD] shadow-sm text-xs font-medium text-[#0D47A1]">
              <span className="size-1.5 rounded-full bg-emerald-500" /> No credit card required
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-[#E3F2FD] shadow-sm text-xs font-medium text-[#0D47A1]/70">
              Setup in ~2 minutes
            </div>
          </div>
        </div>

        {/* Right — premium timeline cards */}
        <div className="relative">
          {/* premium vertical line — soft blue, not black */}
          <div
            aria-hidden
            className="absolute left-5 top-6 hidden h-[calc(100%-48px)] w-px bg-gradient-to-b from-[#90CAF9]/60 via-[#90CAF9]/30 to-transparent md:block"
          />

          <div className="flex flex-col gap-5">
            {steps.map((s) => (
              <div
                key={s.title}
                className="group relative flex gap-4 rounded-2xl border border-[#E3F2FD] bg-white p-5 shadow-[0_4px_20px_rgba(13,71,161,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(13,71,161,0.12)] hover:border-[#90CAF9]/40 md:p-6"
              >
                {/* number watermark */}
                <span className="pointer-events-none absolute right-4 top-4 text-4xl font-bold tracking-tighter text-[#E3F2FD] group-hover:text-[#90CAF9]/30 transition-colors">
                  {s.number}
                </span>

                <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0D47A1] text-white shadow-md shadow-[#0D47A1]/20 group-hover:bg-[#0D47A1]/90 transition-colors">
                  <s.icon className="size-5" />
                </span>

                <div className="relative z-10 flex flex-1 flex-col gap-1.5 pr-6">
                  <h3 className="font-heading text-[15px] font-semibold tracking-tight text-[#0D47A1]">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#0D47A1]/70">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
