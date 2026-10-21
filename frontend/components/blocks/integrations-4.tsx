"use client"

import { useState } from "react"
import {
  BookOpen,
  CalendarDays,
  Check,
  CreditCard,
  HardDrive,
  MessageCircle,
  Plug,
  Workflow,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Godaddy } from "@/components/ui/svgs/godaddy"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
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
    icon: (p: IconProps) => <MessageCircle {...p} />,
    category: "Messaging",
    defaultConnected: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description:
      "Two-way sync so every appointment lands on the doctor's personal calendar.",
    icon: (p: IconProps) => <CalendarDays {...p} />,
    category: "Scheduling",
    defaultConnected: true,
  },
  {
    id: "razorpay",
    name: "Razorpay",
    description:
      "Collect consultation fees and settle UPI, card and netbanking payments.",
    icon: (p: IconProps) => <CreditCard {...p} />,
    category: "Payments",
  },
  {
    id: "tally",
    name: "Tally",
    description:
      "Export GST-ready invoices and daily collections straight into your books.",
    icon: (p: IconProps) => <BookOpen {...p} />,
    category: "Accounting",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description:
      "Back up reports, prescriptions and patient documents automatically.",
    icon: (p: IconProps) => <HardDrive {...p} />,
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
  {
    id: "zapier",
    name: "Zapier",
    description:
      "Trigger your own workflows when a patient books, arrives or pays a bill.",
    icon: (p: IconProps) => <Workflow {...p} />,
    category: "Automation",
  },
]

export default function IntegrationsBlock() {
  const [connected, setConnected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      integrations.map((i) => [i.id, Boolean(i.defaultConnected)])
    )
  )

  const toggle = (id: string) =>
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }))

  const connectedCount = integrations.filter((i) => connected[i.id]).length

  return (
    <section
      id="integrations"
      className="flex w-full scroll-mt-24 justify-center bg-muted/30 px-6 py-16 text-foreground sm:py-20"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary">
              <Plug data-icon="inline-start" className="size-3.5" />
              Popular integrations
            </Badge>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Works with the tools you already use
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Turn on the connections your clinic needs — no copy-paste, no
              double entry, no extra logins for your staff.
            </p>
          </div>
          <p className="text-sm whitespace-nowrap text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {connectedCount}
            </span>{" "}
            of {integrations.length} connected
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {integrations.map((integration) => {
            const isOn = Boolean(connected[integration.id])
            const Icon = integration.icon
            return (
              <Card
                key={integration.id}
                className={cn(
                  "flex flex-col gap-0 transition-colors",
                  isOn && "border-primary/40 bg-primary/[0.03]"
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground transition-colors",
                        integration.wordmark ? "w-20" : "size-10",
                        isOn && "border-primary/30 bg-primary/10 text-primary"
                      )}
                    >
                      <Icon
                        className={cn(
                          integration.wordmark
                            ? "h-4 w-auto text-foreground"
                            : "size-5"
                        )}
                      />
                    </span>
                    <div className="space-y-0.5">
                      <CardTitle className="text-base leading-none">
                        {integration.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {integration.category}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={() => toggle(integration.id)}
                    aria-label={`Toggle ${integration.name}`}
                  />
                </CardHeader>

                <CardContent className="flex-1 py-4">
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                </CardContent>

                <CardFooter className="items-center justify-between">
                  {isOn ? (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                      <Check data-icon="inline-start" className="size-3.5" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                  <Button
                    variant={isOn ? "ghost" : "default"}
                    size="sm"
                    onClick={() => toggle(integration.id)}
                    className={cn(isOn && "text-muted-foreground")}
                  >
                    {isOn ? "Disconnect" : "Connect"}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
