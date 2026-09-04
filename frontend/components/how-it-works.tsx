import { Building2, Stethoscope, MessageCircle, LayoutDashboard } from "lucide-react";

const steps = [
  {
    icon: Building2,
    title: "Register your clinic",
    desc: "Create your clinic in under 2 minutes — set hours, address and WhatsApp number. No credit card required.",
    iconStyle: "bg-[#0D47A1] text-white border-transparent",
  },
  {
    icon: Stethoscope,
    title: "Add doctors & services",
    desc: "Add doctors, fees and available timings. Patients find you by city and book instantly.",
    iconStyle: "bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: MessageCircle,
    title: "Patients book on WhatsApp",
    desc: "Share your link — patients book, reschedule or cancel on WhatsApp 24/7 with automatic reminders.",
    iconStyle: "bg-[#E3F2FD] text-[#0D47A1] border-[#90CAF9]/30",
  },
  {
    icon: LayoutDashboard,
    title: "Run everything from one place",
    desc: "Manage appointments, queue, bills and reports — all in one simple dashboard built for your clinic.",
    iconStyle: "bg-white text-[#0D47A1] border-[#90CAF9]/30",
  },
];

export function HowItWorks() {
  return (
    <section className="relative w-full overflow-hidden bg-[#F8FBFF] px-6 py-20">
      {/* soft clinic glows - matches Why MyClinics section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 350px at 10% 15%, rgba(144,202,249,0.14), transparent 60%), radial-gradient(700px 400px at 95% 80%, rgba(33,150,243,0.07), transparent 60%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-start">
        {/* Left copy */}
        <div className="sticky top-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#90CAF9]/30 bg-white px-3 py-1 text-xs font-semibold tracking-widest text-[#0D47A1] shadow-sm">
            <span className="size-2 rounded-full bg-[#2196F3] animate-pulse" />
            HOW IT WORKS
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#0D47A1] leading-tight">
            Clinic live
            <br />
            <span className="text-[#2196F3]">in four steps</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#0D47A1]/70">
            From signup to first appointment in minutes. MyClinics handles bookings, reminders
            and queue updates — so your team can focus on care.
          </p>

          <div className="mt-6 hidden items-center gap-3 md:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#0D47A1]/70 border border-[#E3F2FD] shadow-sm">
              No training needed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#0D47A1]/70 border border-[#E3F2FD] shadow-sm">
              Works on WhatsApp & web
            </span>
          </div>
        </div>

        {/* Right timeline */}
        <div className="relative flex flex-col gap-4">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="group relative flex gap-4 rounded-2xl border border-[#E3F2FD] bg-white p-5 shadow-[0_4px_16px_rgba(13,71,161,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(13,71,161,0.10)] hover:border-[#90CAF9]/50"
            >
              {/* connector line - soft blue gradient, not black */}
              {i < steps.length - 1 && (
                <span
                  className="absolute left-10 top-[56px] h-[22px] w-px bg-gradient-to-b from-[#90CAF9]/50 to-[#90CAF9]/10 hidden md:block"
                  aria-hidden
                />
              )}

              <span
                className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${s.iconStyle}`}
              >
                <s.icon className="size-5" aria-hidden="true" />
              </span>

              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#F8FBFF] border border-[#E3F2FD] text-[11px] font-bold text-[#0D47A1]">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold tracking-tight text-[#0D47A1]">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#0D47A1]/70">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
