import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CloudShader } from "@/components/ui/cloud-shader"
import { CalendarCheck, MessageCircle } from "lucide-react"

export default function SecondaryHeroBlock() {
  return (
    <section className="relative flex w-full flex-col items-center overflow-hidden px-6 py-20 text-foreground">
      <CloudShader
        className="absolute inset-0"
        skyTopColor="#0D47A1"
        skyBottomColor="#90CAF9"
        cloudColor="#E3F2FD"
      />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <Badge
          variant="secondary"
          className="border border-white/40 bg-white/60 text-black backdrop-blur-sm"
        >
          For Patients
        </Badge>
        <h2 className="mt-6 font-heading text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-5xl">
          Your care, and your clinic, above the clouds
        </h2>
        <p className="mt-5 max-w-2xl text-base text-black/80 sm:text-lg">
          Book your next appointment in under a minute — online or straight
          from WhatsApp. Your records, prescriptions and reports stay with you,
          and a reminder arrives before every visit.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button render={<a href="/#book" />} nativeButton={false} className="mt-2">
            Book an appointment
            <CalendarCheck data-icon="inline-end" aria-hidden="true" />
          </Button>
          <Button
            render={<a href="/signup" />}
            nativeButton={false}
            variant="outline"
            className="mt-2 border-white/50 bg-white/60 text-black hover:bg-white/80"
          >
            Message us on WhatsApp
            <MessageCircle data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="relative z-10 mt-14 w-full max-w-4xl rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl shadow-[#0D47A1]/30 backdrop-blur-xl">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <CalendarCheck className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Appointment confirmed
              </p>
              <p className="text-sm text-muted-foreground">
                Dr. A. Sharma · Cardiology · Today at 11:00
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
              Confirmed
            </span>
            <span className="text-xs text-muted-foreground">
              Reminder set on WhatsApp
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}