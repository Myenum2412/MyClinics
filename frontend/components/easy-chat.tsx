"use client";
import Image from "next/image";

function Bubble({ children, variant = "incoming" }: { children: React.ReactNode; variant?: "incoming" | "outgoing" }) {
  return (
    <div className={`flex w-full ${variant === "outgoing" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${variant === "outgoing" ? "bg-[#E3F2FD] text-black rounded-br-none" : "bg-gray-100 text-black rounded-bl-none"}`}>
        {children}
      </div>
    </div>
  );
}

export function EasyChat() {
  return (
    <section className="w-full bg-white px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full bg-[#E3F2FD] px-3 py-1 text-xs font-semibold tracking-widest text-black">AI ASSISTANT</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-black">Meet Ai Root</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-black/70">Your friendly clinic assistant — chat naturally, no learning curve. Just ask and Ai Root handles the rest.</p>
        </div>
        <div className="mx-auto flex w-full max-w-3xl items-start gap-4 rounded-2xl border bg-gray-50 p-6">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Image src="/aidps.png" alt="Ai Root" width={64} height={64} className="size-14 rounded-full object-cover border-2 border-[#E3F2FD]" />
            <span className="text-xs font-semibold text-black">Ai Root</span>
            <span className="flex items-center gap-1 text-[10px] text-green-600"><span className="size-2 rounded-full bg-green-500" /> Online</span>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <Bubble>👋 Hi, I&apos;m <b>Ai Root</b>! Just tell me what you need — &quot;Book an appointment&quot; or &quot;Show my prescriptions&quot;</Bubble>
            <Bubble variant="outgoing">Book an appointment for tomorrow 10 AM</Bubble>
            <Bubble>✅ Done! Appointment with Dr. Sharma confirmed for tomorrow at 10:00 AM. I&apos;ll send you a reminder.</Bubble>
          </div>
        </div>
      </div>
    </section>
  );
}
