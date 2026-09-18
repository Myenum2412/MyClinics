import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowRight } from "lucide-react"

const popularPages = [
  { label: "Clinic Dashboard", href: "/clinic" },
  { label: "Appointments", href: "/clinic/appointments" },
  { label: "Patients", href: "/clinic/patients" },
  { label: "AI Assistant", href: "/clinic/ai-assistant" },
]

export default function ErrorBlock() {
  return (
    <section className="flex min-h-svh w-full flex-col items-center justify-center gap-8 bg-background px-6 py-12 text-center text-foreground">
      <div className="flex flex-col items-center gap-2">
        <span className="text-6xl font-bold tracking-tight tabular-nums sm:text-7xl">
          404
        </span>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Page not found
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We could not find this clinic page. Go back to your dashboard or pick a popular page below.
        </p>
      </div>

      <form
        action="#"
        className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
      >
        <Input
          type="search"
          placeholder="Search patients, appointments..."
          aria-label="Search clinic"
          className="h-9 flex-1 text-sm"
        />
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          <Search data-icon="inline-start" aria-hidden="true" />
          Search
        </Button>
      </form>

      <div className="flex w-full max-w-md flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Popular pages
        </p>
        <ul className="flex flex-col border-t border-border">
          {popularPages.map((page) => (
            <li key={page.href} className="border-b border-border">
              <a
                href={page.href}
                className="group flex items-center justify-between gap-4 py-2.5 text-sm text-foreground"
              >
                <span>{page.label}</span>
                <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
