"use client";
import Image from "next/image";
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
    <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b border-border bg-white px-6 text-black">
      <Link href="/" className="flex shrink-0 items-center">
        <Image src="/logobg.png" alt="My Clinics" width={140} height={40} className="h-9 w-auto" priority />
      </Link>

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
        {navLinks.map((link) => (
          <Button
            key={link.label}
            render={<a href={link.href} />}
            nativeButton={false}
            variant="ghost"
            className="text-black hover:text-black"
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
          className="hidden sm:inline-flex text-black hover:text-black"
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
              <SheetTitle className="flex items-center">
                <Image src="/logobg.png" alt="My Clinics" width={120} height={32} className="h-8 w-auto" />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-2">
              {navLinks.map((link) => (
                <SheetClose
                  key={link.label}
                  render={<a href={link.href} />}
                  nativeButton={false}
                  className="rounded-md px-2 py-2.5 text-sm font-medium text-black hover:bg-muted hover:text-black"
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
