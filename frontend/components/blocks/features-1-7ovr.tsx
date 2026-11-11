import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CalendarCheck,
  ClipboardList,
  Folder,
  Pill,
  ReceiptIndianRupee,
  Stethoscope,
} from "lucide-react"

type IconProps = { className?: string; size?: number | string }

const features = [
  {
    icon: (p: IconProps) => (
      <CalendarCheck {...p} />
    ),
    title: "Appointments & live queue",
    copy: "Online or WhatsApp booking, with a live queue patients can follow from their phone.",
  },
  {
    icon: (p: IconProps) => (
      <ClipboardList {...p} />
    ),
    title: "Patient records",
    copy: "Visit history, investigations and reports attached to a single patient file.",
  },
  {
    icon: (p: IconProps) => (
      <Stethoscope {...p} />
    ),
    title: "Treatment & care",
    copy: "Document diagnosis, clinical procedures, progress notes and personalized treatment plans.",
  },
  {
    icon: (p: IconProps) => (
      <Pill {...p} />
    ),
    title: "Prescriptions",
    copy: "Digital Rx on your clinic letterhead — print, share or send in a tap.",
  },
  {
    icon: (p: IconProps) => (
      <ReceiptIndianRupee {...p} />
    ),
    title: "Billing & payments",
    copy: "Invoices, collections and outstanding dues reconciled to the rupee.",
  },
  {
    icon: (p: IconProps) => (
      <Folder {...p} />
    ),
    title: "Medical Record",
    copy: "Centralized medical files, clinical histories, lab attachments, and diagnostic timelines.",
  },
]

export default function FeaturesBlock() {
  return (
    <section
      id="features"
      className="relative w-full scroll-mt-24 bg-black px-6 py-20 text-white"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium tracking-widest text-blue-400 uppercase">
            Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything your clinic needs
          </h2>
          <p className="mt-3 text-white/60">
            From the first appointment to the final bill — one platform instead of six tools.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {features.map(({ icon: Icon, title, copy }) => (
            <Card
              key={title}
              className="bg-white p-6 text-zinc-900 border border-zinc-200/80 shadow-md transition-all duration-200 hover:shadow-xl hover:border-zinc-300"
            >
              <CardHeader className="p-0">
                <span className="flex size-11 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="mt-4 text-base font-semibold text-zinc-900">
                  {title}
                </CardTitle>
                <CardDescription className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  {copy}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
