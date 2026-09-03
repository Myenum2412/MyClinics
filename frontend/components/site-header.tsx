"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { ArrowRight, Menu } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b border-border bg-background/80 backdrop-blur px-6">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <span className="text-base font-bold tracking-tight">My Clinics</span>
      </Link>

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
          render={<Link href="/login" />}
          nativeButton={false}
          variant="ghost"
          className="hidden sm:inline-flex"
        >
          Sign In
        </Button>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <Button
          render={<Link href="/login" />}
          nativeButton={false}
          className="hidden sm:inline-flex"
        >
          Start Free Trial
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>

        <Sheet>
          <SheetTrigger
            render={<Button variant="outline" size="icon" className="md:hidden" />}
            aria-label="Open menu"
          >
            <Menu aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xs">
            <SheetHeader>
              <SheetTitle>My Clinics</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-2">
              {navLinks.map((link) => (
                <SheetClose
                  key={link.label}
                  render={<a href={link.href} />}
                  nativeButton={false}
                  className="rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </SheetClose>
              ))}
            </nav>
            <SheetFooter>
              <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" className="w-full">
                Sign In
              </Button>
              <Button render={<Link href="/login" />} nativeButton={false} className="w-full">
                Start Free Trial <ArrowRight data-icon="inline-end" />
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
