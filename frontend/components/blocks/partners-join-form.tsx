"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Free, key-less geo APIs. */
const COUNTRIES_URL = "https://countriesnow.space/api/v0.1/countries/iso"
const statesUrl = (country: string) =>
  `https://countriesnow.space/api/v0.1/countries/states/q?country=${encodeURIComponent(country)}`

type Country = { name: string; iso2: string }

const fieldClass =
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors outline-none focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/40"

export default function PartnersJoinForm() {
  const [open, setOpen] = React.useState(false)

  const [countries, setCountries] = React.useState<Country[]>([])
  const [countriesStatus, setCountriesStatus] = React.useState<
    "loading" | "ready" | "error"
  >("loading")
  const [country, setCountry] = React.useState<string | null>(null)

  const [states, setStates] = React.useState<string[]>([])
  const [statesStatus, setStatesStatus] = React.useState<
    "idle" | "loading" | "ready" | "empty" | "error"
  >("idle")
  const [state, setState] = React.useState<string | null>(null)

  const [submitting, setSubmitting] = React.useState(false)

  // Countries list (one small call, ~10KB).
  React.useEffect(() => {
    let cancelled = false
    fetch(COUNTRIES_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad response"))))
      .then((json) => {
        if (cancelled) return
        const list: Country[] = (json?.data ?? [])
          .map((c: { name?: string; Iso2?: string }) => ({
            name: c.name ?? "",
            iso2: c.Iso2 ?? c.name ?? "",
          }))
          .filter((c: Country) => Boolean(c.name))
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name))
        setCountries(list)
        setCountriesStatus(list.length ? "ready" : "error")
      })
      .catch(() => !cancelled && setCountriesStatus("error"))
    return () => {
      cancelled = true
    }
  }, [])

  // States for the selected country.
  React.useEffect(() => {
    if (!country) {
      setStates([])
      setStatesStatus("idle")
      return
    }
    let cancelled = false
    setStatesStatus("loading")
    fetch(statesUrl(country))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad response"))))
      .then((json) => {
        if (cancelled) return
        const list: string[] = (json?.data?.states ?? [])
          .map((s: { name?: string }) => s.name ?? "")
          .filter(Boolean)
        setStates(list)
        setStatesStatus(list.length ? "ready" : "empty")
      })
      .catch(() => !cancelled && setStatesStatus("error"))
    return () => {
      cancelled = true
    }
  }, [country])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitting(true)
    // Partner enquiries are not wired to a backend yet — wire this to your CRM/API.
    setTimeout(() => {
      setSubmitting(false)
      setOpen(false)
      setState(null)
      form.reset()
      toast.success("Thanks! Our partnerships team will be in touch shortly.")
    }, 400)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="mt-8 h-14 rounded-full bg-blue-600 px-12 text-base font-semibold text-white shadow-[0_18px_60px_-12px_rgba(29,78,216,0.9)] ring-1 ring-white/30 transition-transform hover:scale-105 hover:bg-blue-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/60" />
        }
      >
        Join Now
      </DialogTrigger>

      <DialogContent className="max-w-lg bg-white p-6 text-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-zinc-900">
            Become a My Clinics partner
          </DialogTitle>
          <DialogDescription className="text-zinc-600">
            Tell us a little about you and your company — we&apos;ll get back
            within one working day.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-name" className="text-zinc-700">
              Name
            </Label>
            <Input id="partner-name" name="name" required placeholder="Your full name" className={fieldClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-email" className="text-zinc-700">
              Email id
            </Label>
            <Input
              id="partner-email"
              name="email"
              type="email"
              required
              placeholder="work@company.com"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-company" className="text-zinc-700">
              Company Name
            </Label>
            <Input id="partner-company" name="company" required placeholder="Your company" className={fieldClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-zinc-700">Country</Label>
            {countriesStatus === "loading" ? (
              <div className={cn(fieldClass, "flex items-center gap-2 text-zinc-500")}>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading countries…
              </div>
            ) : countriesStatus === "error" ? (
              <Input
                name="country"
                required
                placeholder="Type your country"
                className={fieldClass}
              />
            ) : (
              <Select
                value={country}
                onValueChange={(v) => {
                  setCountry(v)
                  setState(null)
                }}
              >
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.iso2} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-zinc-700">State</Label>
            {statesStatus === "idle" ? (
              <div className={cn(fieldClass, "flex items-center text-zinc-400")}>
                Select a country first
              </div>
            ) : statesStatus === "loading" ? (
              <div className={cn(fieldClass, "flex items-center gap-2 text-zinc-500")}>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading states…
              </div>
            ) : statesStatus === "ready" ? (
              <Select value={state} onValueChange={(v) => setState(v)}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                name="state"
                required
                placeholder="Type your state"
                className={fieldClass}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-phone" className="text-zinc-700">
              Phone Number
            </Label>
            <Input
              id="partner-phone"
              name="phone"
              type="tel"
              required
              placeholder="+91 98765 43210"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
