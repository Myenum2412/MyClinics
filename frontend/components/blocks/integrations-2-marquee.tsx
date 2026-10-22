"use client"

import Link from "next/link"
import { ArrowRight, Mail } from "lucide-react"

import { Slack } from "@/components/ui/svgs/slack"
import { GithubDark } from "@/components/ui/svgs/githubDark"
import { Google } from "@/components/ui/svgs/google"
import { Notion } from "@/components/ui/svgs/notion"
import { Figma } from "@/components/ui/svgs/figma"
import { Discord } from "@/components/ui/svgs/discord"
import { Microsoft } from "@/components/ui/svgs/microsoft"
import { Paypal } from "@/components/ui/svgs/paypal"
import { Dropbox } from "@/components/ui/svgs/dropbox"
import { Trello } from "@/components/ui/svgs/trello"
import { Telegram } from "@/components/ui/svgs/telegram"
import { WhatsappIcon } from "@/components/ui/svgs/whatsappIcon"
import { SpotifyIcon } from "@/components/ui/svgs/spotifyIcon"
import { AppleDark } from "@/components/ui/svgs/appleDark"
import { Linkedin } from "@/components/ui/svgs/linkedin"
import { InstagramIcon } from "@/components/ui/svgs/instagramIcon"
import { XDark } from "@/components/ui/svgs/xDark"

type IconComponent = (props: React.ComponentProps<"svg">) => React.ReactNode

const integrations: { name: string; Icon: IconComponent }[] = [
  { name: "Slack", Icon: Slack },
  { name: "GitHub", Icon: GithubDark },
  { name: "Google", Icon: Google },
  { name: "Notion", Icon: Notion },
  { name: "Figma", Icon: Figma },
  { name: "Discord", Icon: Discord },
  { name: "Microsoft", Icon: Microsoft },
  { name: "PayPal", Icon: Paypal },
  { name: "Dropbox", Icon: Dropbox },
  { name: "Trello", Icon: Trello },
  { name: "Telegram", Icon: Telegram },
  { name: "WhatsApp", Icon: WhatsappIcon },
  { name: "Spotify", Icon: SpotifyIcon },
  { name: "Apple", Icon: AppleDark },
  { name: "LinkedIn", Icon: Linkedin },
  { name: "Instagram", Icon: InstagramIcon },
  { name: "X (Twitter)", Icon: XDark },
  {
    name: "Email",
    Icon: (props) => <Mail {...props} />,
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
      className="group/tile flex w-28 shrink-0 flex-col items-center gap-2.5 rounded-xl border border-blue-900/60 bg-blue-950/40 px-3 py-5 ring-1 ring-white/5 ring-inset backdrop-blur-sm transition-colors hover:border-blue-700 hover:bg-blue-900/40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <Icon className="size-7" aria-hidden="true" />
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
