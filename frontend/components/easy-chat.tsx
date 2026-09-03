"use client";
import Image from "next/image";

function Bubble({ children, variant = "incoming" }: { children: React.ReactNode; variant?: "incoming" | "outgoing" }) {
  return (
    <div className={`flex w-full ${variant === "outgoing" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${variant === "outgoing" ? "bg-[#E3F2FD] text-black rounded-br-none" : "bg-gray-100 text-black rounded-bl-none"}`}>
        {children}
      </div>
    </div>
  );
}

export function EasyChat() {
  return (
    <section className="w-full bg-white px-6 py-16">
      <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-2 md:items-center">
        {/* Left: Chat */}
        <div className="flex items-start gap-3 rounded-2xl border bg-gray-50 p-6">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <Image src="/aidps.png" alt="Ai Root" width={56} height={56} className="size-12 rounded-full object-cover border-2 border-[#E3F2FD]" />
            <span className="text-xs font-semibold text-black">Ai Root</span>
            <span className="flex items-center gap-1 text-[10px] text-green-600"><span className="size-1.5 rounded-full bg-green-500" /> Online</span>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <Bubble>👋 Hi, I&apos;m <b>Ai Root</b>! Just tell me what you need.</Bubble>
            <Bubble variant="outgoing">Book an appointment for tomorrow 10 AM</Bubble>
            <Bubble>✅ Done! Appointment with Dr. Sharma — tomorrow 10:00 AM. I&apos;ll remind you.</Bubble>
          </div>
        </div>
        {/* Right: Text */}
        <div>
          <span className="inline-block rounded-full bg-[#E3F2FD] px-3 py-1 text-xs font-semibold tracking-widest text-black">AI ASSISTANT</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-black">Meet Ai Root — <br />Healthcare, Just a Chat Away</h2>
          <p className="mt-3 text-sm leading-relaxed text-black/70">
            No forms, no menus to learn. Simply chat with Ai Root like you would with a friend. Book appointments, check prescriptions, or get reports — all in plain language. Fast, friendly, and always available.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-black">
            <li>✓ Natural language — type as you speak</li>
            <li>✓ Instant confirmations & reminders</li>
            <li>✓ Available 24/7 inside My Clinics</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
