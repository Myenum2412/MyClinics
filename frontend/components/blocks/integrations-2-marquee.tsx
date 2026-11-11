"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

const integrations = [
  { name: "WhatsApp", iconSrc: "/integrations/whatsapp.svg" },
  { name: "Google Calendar", iconSrc: "/integrations/google-calendar.svg" },
  { name: "Razorpay", iconSrc: "/integrations/razorpay.svg" },
  { name: "Google Drive", iconSrc: "/integrations/google-drive.svg" },
  { name: "Google Meet", iconSrc: "/integrations/google-meet.svg" },
  { name: "Gmail", iconSrc: "/integrations/gmail.svg" },
  { name: "Zoom", iconSrc: "/integrations/zoom.svg" },
  { name: "Stripe", iconSrc: "/integrations/stripe.svg" },
  { name: "PayPal", iconSrc: "/integrations/paypal.svg" },
  { name: "Telegram", iconSrc: "/integrations/telegram.svg" },
  { name: "Meta", iconSrc: "/integrations/meta.svg" },
  { name: "GoDaddy", iconSrc: "/integrations/godaddy.svg" },
]

const loop = [0, 1, 2, 3]

function IntegrationTile({
  name,
  iconSrc,
  tabIndex,
}: {
  name: string
  iconSrc: string
  tabIndex?: number
}) {
  return (
    <Link
      href="/integrations"
      tabIndex={tabIndex}
      className="group/tile flex w-36 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl bg-white px-4 py-6 border border-zinc-200/80 shadow-md transition-all duration-200 hover:shadow-xl hover:border-zinc-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <div className="flex size-10 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconSrc}
          alt={name}
          className="size-8 object-contain transition-transform duration-200 group-hover/tile:scale-110"
        />
      </div>
      <span className="w-full truncate text-center text-xs font-semibold text-zinc-800 transition-colors group-hover/tile:text-zinc-950">
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
              className="flex shrink-0 gap-4 pr-4"
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
