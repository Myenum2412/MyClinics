"use client";
import Image from "next/image";

export function EasyChat() {
  return (
    <section className="w-full bg-white px-6 py-16">
      <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-2 md:items-center">
        {/* Left: WhatsApp UI */}
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border shadow-xl">
          <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
            <Image src="/aidps.png" alt="Ai Root" width={40} height={40} className="size-9 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Ai Root</span>
              <span className="text-xs opacity-80">online</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-[#E5DDD5] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat p-4 min-h-[320px]">
            <div className="flex gap-2 items-end"><Image src="/aidps.png" alt="Ai Root" width={24} height={24} className="size-6 rounded-full object-cover shrink-0" /><div className="max-w-[75%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm shadow">👋 Hi, I&apos;m <b>Ai Root</b>! Just tell me what you need.</div></div>
            <div className="max-w-[80%] self-end rounded-lg rounded-tr-none bg-[#DCF8C6] px-3 py-2 text-sm shadow">Book an appointment for tomorrow 10 AM</div>
            <div className="flex gap-2 items-end"><Image src="/aidps.png" alt="Ai Root" width={24} height={24} className="size-6 rounded-full object-cover shrink-0" /><div className="max-w-[75%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm shadow">✅ Done! Appointment with Dr. Sharma — tomorrow 10:00 AM. I&apos;ll remind you.</div></div>
            <span className="mx-auto mt-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-gray-600">TODAY</span>
          </div>
          <div className="flex items-center gap-2 bg-[#F0F0F0] p-3">
            <span className="flex-1 rounded-full bg-white px-4 py-2 text-sm text-gray-400">Type a message</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-[#25D366] text-white">➤</span>
          </div>
        </div>
        {/* Right: Text */}
        <div>
          <span className="inline-block rounded-full bg-[#E3F2FD] px-3 py-1 text-xs font-semibold tracking-widest text-black">CHAT WITH AI ROOT</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-black">Your Clinic, <br />in a WhatsApp Chat</h2>
          <p className="mt-3 text-sm leading-relaxed text-black/70">
            Ai Root lives inside My Clinics and feels exactly like WhatsApp. No training needed — just chat. Patients book visits, doctors manage schedules, and everything stays organized.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-black">
            <li>✓ Book & reschedule appointments in one message</li>
            <li>✓ Prescriptions, bills & reports — instantly shared</li>
            <li>✓ Smart reminders & follow-ups — never miss a visit</li>
            <li>✓ Secure & private — your data stays protected</li>
            <li>✓ Same familiar WhatsApp experience your team loves</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-black/70">
            From first consultation to post-treatment care, Ai Root keeps the conversation flowing. Patients feel at home, staff saves hours every week.
          </p>
        </div>
      </div>
    </section>
  );
}
