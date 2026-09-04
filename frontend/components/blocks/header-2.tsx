"use client"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ArrowRight, Menu } from "lucide-react"

const navLinks = [
  { label: "Products", href: "#" },
  { label: "Solutions", href: "#" },
  { label: "Pricing", href: "#" },
  { label: "Docs", href: "#" },
]

export default function HeaderBlock() {
  return (
    <section className="flex min-h-svh w-full flex-col bg-background text-foreground">
      <header className="relative flex h-16 w-full items-center border-b border-border px-6">
        <a href="#" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logobg.png" alt="My Clinics" className="h-16 w-auto object-contain shrink-0" />
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Button
              key={link.label}
              render={<a href={link.href} />}
              nativeButton={false}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <Button
            render={<a href="#" />}
            nativeButton={false}
            variant="ghost"
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            Sign In
          </Button>
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
          <Button
            render={<a href="#" />}
            nativeButton={false}
            className="hidden sm:inline-flex"
          >
            Start Free Trial
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="md:hidden" />
              }
              aria-label="Open menu"
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xs">
              <SheetHeader>
                <SheetTitle className="flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logobg.png" alt="My Clinics" className="h-16 w-auto object-contain shrink-0" />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-2">
                {navLinks.map((link) => (
                  <SheetClose
                    key={link.label}
                    render={<a href={link.href} />}
                    nativeButton={false}
                    className="rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </SheetClose>
                ))}
              </nav>
              <SheetFooter>
                <Button
                  render={<a href="#" />}
                  nativeButton={false}
                  variant="ghost"
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button
                  render={<a href="#" />}
                  nativeButton={false}
                  className="w-full"
                >
                  Start Free Trial
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex-1 px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-4/5 max-w-lg" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
