"use client"

import Link from "next/link"
import { ArrowRight, Mail, MessageSquare } from "lucide-react"

import { Google } from "@/components/ui/svgs/google"
import { Paypal } from "@/components/ui/svgs/paypal"
import { Telegram } from "@/components/ui/svgs/telegram"
import { WhatsappIcon } from "@/components/ui/svgs/whatsappIcon"
import { GoogleCalendar } from "@/components/ui/svgs/googleCalendar"
import { Drive } from "@/components/ui/svgs/drive"
import { Razorpay } from "@/components/ui/svgs/razorpay"
import { Godaddy } from "@/components/ui/svgs/godaddy"

type IconComponent = (props: React.ComponentProps<"svg">) => React.ReactNode

const integrations: { name: string; Icon: IconComponent }[] = [
  { name: "WhatsApp", Icon: WhatsappIcon },
  { name: "Google Calendar", Icon: GoogleCalendar },
  { name: "Razorpay", Icon: Razorpay },
  { name: "Google Drive", Icon: Drive },
  { name: "GoDaddy", Icon: Godaddy },
  { name: "Google Workspace", Icon: Google },
  { name: "PayPal", Icon: Paypal },
  { name: "Telegram", Icon: Telegram },
  {
    name: "Email",
    Icon: (props) => <Mail {...props} />,
  },
  {
    name: "SMS Gateway",
    Icon: (props) => <MessageSquare {...props} />,
  },
]

const loop = [0, 1, 2, 3]

function IntegrationTile({
  name,
  Icon,
  tabIndex,
}: (typeof integrations)[number] & { tabIndex?: number }) {
  return (
    <Link
      href="/integrations"
      tabIndex={tabIndex}
      className="group/tile flex w-32 shrink-0 flex-col items-center gap-2.5 rounded-xl border border-blue-900/60 bg-blue-950/40 px-3 py-5 ring-1 ring-white/5 ring-inset backdrop-blur-sm transition-colors hover:border-blue-700 hover:bg-blue-900/40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <div className="flex size-7 items-center justify-center">
        <Icon className="max-h-7 max-w-7 w-auto h-auto" aria-hidden="true" />
      </div>
      <span className="w-full truncate text-center text-xs font-medium text-white/70 transition-colors group-hover/tile:text-white">
        {name}
      </span>
    </Link>
  )
}

export default function IntegrationsMarquee() {
  return (
    <section
      id="integrations"
      className="relative w-full scroll-mt-24 overflow-hidden border-y border-blue-900/50 bg-black px-6 py-20 text-white"
    >
      <div
        className="absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage: "url('/inter.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />
      <div className="mx-auto w-full max-w-5xl text-center">
        <span className="text-sm font-medium tracking-widest text-blue-400 uppercase">
          Integrations
        </span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Plug in to everything your clinic uses
        </h2>
        <p className="mt-3 text-white/60">
          Calendars, messaging, payments and storage — connect the tools you
          already rely on, no custom code required.
        </p>
      </div>

      <div
        className="group relative mt-12"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}
      >
        <div className="flex w-max animate-[wensity-marquee-x_50s_linear_infinite] group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {loop.map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy > 0}
              className="flex shrink-0 gap-3 pr-3"
            >
              {integrations.map((integration) => (
                <li key={integration.name} className="flex">
                  <IntegrationTile
                    {...integration}
                    tabIndex={copy > 0 ? -1 : undefined}
                  />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 underline-offset-4 hover:text-blue-300 hover:underline"
        >
          See all integrations
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
