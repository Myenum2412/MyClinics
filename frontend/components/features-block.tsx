import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, ChevronRight } from "lucide-react"

const checklist = [
  "Appointments, rescheduling and WhatsApp reminders — automated",
  "Prescriptions, medicines and billing from one dashboard",
  "Patient reports uploaded straight into their record",
  "WhatsApp and AI assistant that book patients 24/7",
]

const schedule = [
  { time: "09:30", name: "Anita Sharma", status: "Confirmed" },
  { time: "10:15", name: "Rahul Verma", status: "Completed" },
  { time: "11:00", name: "Meera Patel", status: "Waiting" },
  { time: "12:30", name: "Suresh Kumar", status: "Confirmed" },
]

const statusPill: Record<string, string> = {
  Confirmed: "bg-primary/10 text-primary",
  Completed: "bg-emerald-500/10 text-emerald-600",
  Waiting: "bg-amber-500/10 text-amber-600",
}

export default function FeaturesBlock() {
  return (
    <section className="flex w-full items-center justify-center bg-white px-6 py-20 text-foreground">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="secondary">For Clinics</Badge>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your clinic runs on. Nothing it doesn&apos;t.
          </h2>
          <p className="text-base text-muted-foreground">
            Replace the appointment diary, paper records, prescription pads and
            billing ledger with one cloud dashboard your whole team can use —
            while the WhatsApp assistant keeps booking patients even when the
            front desk is closed.
          </p>
          <ul className="flex flex-col gap-3">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <Button render={<a href="/signup" />} nativeButton={false} className="mt-2">
            Get started
            <ChevronRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-foreground/20" />
                <span className="size-2 rounded-full bg-foreground/20" />
                <span className="size-2 rounded-full bg-foreground/20" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Today&apos;s schedule
              </span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div className="h-2.5 w-28 rounded-full bg-muted" />
                <div className="h-6 w-16 rounded-md border border-border" />
              </div>
              {schedule.map(({ time, name, status }) => (
                <div
                  key={name}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    <span className="text-xs text-muted-foreground">{time}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusPill[status]}`}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}