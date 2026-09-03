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
    <section className="flex w-full justify-center bg-white px-6 py-16">
      <div className="flex w-full max-w-3xl items-start gap-4">
        <Image src="/aidps.png" alt="AI Assistant" width={64} height={64} className="size-14 shrink-0 rounded-full object-cover border" />
        <div className="flex flex-1 flex-col gap-3">
          <Bubble>👋 Hi! I&apos;m your My Clinics assistant. Just type what you need — no menus to learn.</Bubble>
          <Bubble variant="outgoing">Book an appointment for tomorrow 10 AM</Bubble>
          <Bubble>Done! Your appointment with Dr. Sharma is confirmed for tomorrow at 10:00 AM. You&apos;ll get a reminder.</Bubble>
        </div>
      </div>
    </section>
  );
}
