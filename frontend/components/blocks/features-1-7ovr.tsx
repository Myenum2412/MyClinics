import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  Boxes,
  Pill,
  ReceiptIndianRupee,
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
      <Boxes {...p} />
    ),
    title: "Pharmacy & stock",
    copy: "Medicines, batches and purchases that update inventory as you dispense.",
  },
  {
    icon: (p: IconProps) => (
      <ChartColumn {...p} />
    ),
    title: "Reports & insights",
    copy: "Revenue, footfall and doctor-wise performance on one dashboard.",
  },
]

export default function FeaturesBlock() {
  return (
    <section className="relative w-full px-6 py-20 text-white">
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
              className="bg-blue-950/40 p-6 text-white ring-1 ring-blue-900 backdrop-blur-sm transition-colors hover:ring-blue-700"
            >
              <CardHeader className="p-0">
                <span className="flex size-11 items-center justify-center rounded-lg border border-blue-800 bg-blue-900/40 text-blue-300">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="mt-4 text-base font-semibold text-white">
                  {title}
                </CardTitle>
                <CardDescription className="mt-2 text-sm text-white/60">
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
