import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Bell,
  Bot,
  CalendarClock,
  FileText,
  Lock,
  Users,
} from "lucide-react"

/** Props a call site may pass through to an icon. */
type IconProps = { className?: string; size?: number | string }

const tiles = [
  {
    id: "lead",
    icon: (p: IconProps) => (
      <Bot {...p} />
    ),
    title: "WhatsApp + AI assistant",
    description:
      "Patients message the clinic on WhatsApp any time of day. The assistant greets them, checks availability and books appointments — even when the front desk is closed.",
    span: "md:col-span-2 md:row-span-2",
    iconSize: "size-10 md:size-14",
    titleSize: "text-base md:text-2xl",
    descSize: "text-sm md:text-base",
  },
  {
    id: "speed",
    icon: (p: IconProps) => (
      <CalendarClock {...p} />
    ),
    title: "Appointments in seconds",
    description:
      "Patients pick a doctor, department, date and time — online or on WhatsApp — in under a minute.",
    span: "",
    iconSize: "size-10",
    titleSize: "text-base",
    descSize: "text-sm",
  },
  {
    id: "security",
    icon: (p: IconProps) => (
      <Lock {...p} />
    ),
    title: "Secure health records",
    description:
      "Encrypted in transit and at rest. Only the clinic's care team can access your records.",
    span: "",
    iconSize: "size-10",
    titleSize: "text-base",
    descSize: "text-sm",
  },
  {
    id: "analytics",
    icon: (p: IconProps) => (
      <FileText {...p} />
    ),
    title: "Billing and reports",
    description:
      "Bills as PDFs, payment tracking and patient report uploads — no spreadsheets, no paper.",
    span: "",
    iconSize: "size-10",
    titleSize: "text-base",
    descSize: "text-sm",
  },
  {
    id: "global",
    icon: (p: IconProps) => (
      <Bell {...p} />
    ),
    title: "Patient reminders",
    description:
      "Automated WhatsApp reminders before every visit. Fewer no-shows, a fuller waiting room.",
    span: "",
    iconSize: "size-10",
    titleSize: "text-base",
    descSize: "text-sm",
  },
  {
    id: "teams",
    icon: (p: IconProps) => (
      <Users {...p} />
    ),
    title: "Built for clinics",
    description:
      "Doctors, front desk and managers each get secure role-based access to their own clinic.",
    span: "",
    iconSize: "size-10",
    titleSize: "text-base",
    descSize: "text-sm",
  },
]

export default function BentoBlock() {
  return (
    <section className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Platform
          </span>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            One platform, every capability
          </h2>
          <p className="mt-3 text-muted-foreground">
            My Clinics bundles everything a clinic needs — appointments,
            records, medicines, billing and reports. No plugins, no paper.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:grid-rows-[auto_auto]">
          {tiles.map(
            ({
              id,
              icon: Icon,
              title,
              description,
              span,
              iconSize,
              titleSize,
              descSize,
            }) => (
              <Card
                key={id}
                className={["flex flex-col justify-between p-6", span]
                  .filter(Boolean)
                  .join(" ")}
              >
                <CardHeader className="p-0">
                  <span
                    className={[
                      "flex items-center justify-center rounded-lg border border-border bg-muted",
                      iconSize,
                    ].join(" ")}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle
                    className={["mt-4 font-semibold", titleSize].join(" ")}
                  >
                    {title}
                  </CardTitle>
                  <CardDescription className={["mt-2", descSize].join(" ")}>
                    {description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          )}
        </div>
      </div>
    </section>
  )
}
