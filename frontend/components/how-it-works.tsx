import { UserPlus, Settings2, Users, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    desc: "Sign up in under two minutes, no credit card required. Your workspace is ready the moment you confirm your email.",
  },
  {
    icon: Settings2,
    title: "Configure your workflow",
    desc: "Choose from pre-built templates or define your own pipeline. My Clinics adapts to how your team already works.",
  },
  {
    icon: Users,
    title: "Invite your team",
    desc: "Send role-based invites in bulk. Colleagues join with a single click and inherit the right permissions automatically.",
  },
  {
    icon: Rocket,
    title: "Ship with confidence",
    desc: "Run automated checks, review the audit trail, and deploy, knowing My Clinics has your back at every stage.",
  },
];

export function HowItWorks() {
  return (
    <section className="w-full px-6 py-20" style={{ backgroundColor: "#E3F2FD" }}>
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-widest text-black">HOW IT WORKS</span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-black">Up and running<br />in four steps</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-black">
            My Clinics is designed for momentum. Go from sign-up to full team collaboration without a single support ticket.
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
