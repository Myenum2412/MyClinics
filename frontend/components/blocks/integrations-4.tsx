"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Check, Search } from "lucide-react"

import { useClinicSession } from "@/hooks/use-clinic-session"
import { cn } from "@/lib/utils"
import { Drive } from "@/components/ui/svgs/drive"
import { Godaddy } from "@/components/ui/svgs/godaddy"
import { GoogleCalendar } from "@/components/ui/svgs/googleCalendar"
import { Razorpay } from "@/components/ui/svgs/razorpay"
import { WhatsappIcon } from "@/components/ui/svgs/whatsappIcon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

type IconProps = { className?: string; size?: number | string }

type Integration = {
  id: string
  name: string
  description: string
  icon: (props: IconProps) => React.ReactNode
  category: string
  defaultConnected?: boolean
  wordmark?: boolean
}

const integrations: Integration[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description:
      "Send booking confirmations, reminders and prescriptions straight to the patient's chat.",
    icon: (p: IconProps) => <WhatsappIcon {...p} />,
    category: "Messaging",
    defaultConnected: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description:
      "Two-way sync so every appointment lands on the doctor's personal calendar.",
    icon: (p: IconProps) => <GoogleCalendar {...p} />,
    category: "Scheduling",
    defaultConnected: true,
  },
  {
    id: "razorpay",
    name: "Razorpay",
    description:
      "Collect consultation fees and settle UPI, card and netbanking payments.",
    icon: (p: IconProps) => <Razorpay {...p} />,
    category: "Payments",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description:
      "Back up reports, prescriptions and patient documents automatically.",
    icon: (p: IconProps) => <Drive {...p} />,
    category: "Storage",
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    description:
      "Point your clinic's domain and website at My Clinics and go live in minutes.",
    icon: (p: IconProps) => <Godaddy {...p} />,
    category: "Domains",
    wordmark: true,
  },
]

export default function IntegrationsBlock() {
  const { session, loading: sessionLoading } = useClinicSession()
  const signedIn = Boolean(session)
  const [connected, setConnected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      integrations.map((i) => [i.id, Boolean(i.defaultConnected)])
    )
  )
  const [query, setQuery] = useState("")

  const toggle = (id: string) =>
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }))

  const normalizedQuery = query.trim().toLowerCase()
  const filteredIntegrations = integrations.filter((integration) =>
    `${integration.name} ${integration.category} ${integration.description}`
      .toLowerCase()
      .includes(normalizedQuery)
  )

  return (
    <section
      id="integrations"
      className="w-full scroll-mt-24 text-foreground"
    >
      <div className="relative isolate overflow-hidden border-b border-border">
        <Image
          src="/inter.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-60 sm:opacity-100"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background"
        />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-16 pb-14 text-center sm:pt-20 sm:pb-16">
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Integrations
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            Connect the apps your clinic already uses and keep everything in
            sync.
          </p>
          <div className="relative mt-6 w-full max-w-xl">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search integrations..."
              aria-label="Search integrations"
              className="h-11 w-full bg-background pl-10"
            />
          </div>
        </div>
      </div>

      <div className="bg-muted/30 px-6 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-7xl">
          {filteredIntegrations.length > 0 ? (
            <div className="flex flex-col gap-3">
            {filteredIntegrations.map((integration) => {
              const isOn = Boolean(connected[integration.id])
              const Icon = integration.icon
              return (
                <Card
                  key={integration.id}
                  className={cn(
                    "w-full gap-0 py-0 transition-colors",
                    isOn && "border-primary/40 bg-primary/[0.03]"
                  )}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex min-w-0 items-center gap-3 sm:w-64 sm:shrink-0">
                      <span
                        className={cn(
                          "flex h-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors",
                          integration.wordmark ? "w-24" : "w-11",
                          isOn && "border-primary/30 bg-primary/10 text-primary"
                        )}
                      >
                        <Icon
                          className={cn(
                            integration.wordmark
                              ? "h-4 w-auto text-foreground"
                              : "size-6"
                          )}
                        />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">
                          {integration.name}
                        </CardTitle>
                        <CardDescription className="mt-0.5 text-xs">
                          {integration.category}
                        </CardDescription>
                      </div>
                    </div>

                    <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                      {integration.description}
                    </p>

                    <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:justify-end">
                      {sessionLoading ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="text-muted-foreground"
                        >
                          Checking…
                        </Button>
                      ) : signedIn ? (
                        <>
                          {isOn ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                              <Check
                                data-icon="inline-start"
                                className="size-3.5"
                              />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not connected</Badge>
                          )}
                          <Switch
                            checked={isOn}
                            onCheckedChange={() => toggle(integration.id)}
                            aria-label={`Toggle ${integration.name}`}
                          />
                          <Button
                            variant={isOn ? "ghost" : "default"}
                            size="sm"
                            onClick={() => toggle(integration.id)}
                            className={cn(isOn && "text-muted-foreground")}
                          >
                            {isOn ? "Disconnect" : "Connect"}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          nativeButton={false}
                          render={
                            <Link
                              href={{
                                pathname: "/login",
                                query: { callbackUrl: "/integrations" },
                              }}
                            />
                          }
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-background/60 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No integrations found for “{query.trim()}”.
            </p>
          </div>
        )}
        </div>
      </div>
    </section>
  )
}
