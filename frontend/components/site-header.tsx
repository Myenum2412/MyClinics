"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Separator } from "@/components/ui/separator";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
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
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/#contact" },
];

export function SiteHeader() {
  const scrolled = useScroll(10);
  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-16 w-full items-center border border-transparent bg-white px-6 text-black transition-all duration-300",
        scrolled && "top-2 mx-auto max-w-3xl rounded-full border-border bg-white/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80"
      )}
    >
      <Link href="/" className="flex shrink-0 items-center">
        <Image src="/logobg.png" alt="My Clinics" width={180} height={54} className="h-16 w-auto object-contain" priority />
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
          className={cn("hidden sm:inline-flex text-black hover:text-black transition-all", scrolled && "hidden sm:hidden")}
        >
          Sign In
        </Button>
        <Separator orientation="vertical" className={cn("hidden h-5 sm:block", scrolled && "hidden sm:hidden")} />
        <RainbowButton className="hidden sm:inline-flex" style={{ "--color-1": "#DBEAFE", "--color-2": "#2563EB", "--color-3": "#3B82F6", "--color-4": "#1D4ED8", "--color-5": "#60A5FA" } as React.CSSProperties}>
          <Link href="/login" className="flex items-center gap-1.5 text-white">
            Start Free Trial <ArrowRight className="text-white" data-icon="inline-end" aria-hidden="true" />
          </Link>
        </RainbowButton>

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
                <Image src="/logobg.png" alt="My Clinics" width={160} height={48} className="h-16 w-auto object-contain" />
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
              <RainbowButton className="w-full" style={{ "--color-1": "#DBEAFE", "--color-2": "#2563EB", "--color-3": "#3B82F6", "--color-4": "#1D4ED8", "--color-5": "#60A5FA" } as React.CSSProperties}>
                <Link href="/login" className="flex items-center gap-1.5 text-white">Start Free Trial <ArrowRight className="text-white" data-icon="inline-end" /></Link>
              </RainbowButton>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
