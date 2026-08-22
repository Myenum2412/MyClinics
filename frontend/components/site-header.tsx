import Link from "next/link";

import { cn } from "@/lib/utils";

export default function SiteHeader({
  variant = "default",
}: {
  variant?: "default" | "hero";
}) {
  const hero = variant === "hero";
  return (
    <nav
      className={cn(
        "mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8",
        hero && "relative z-20"
      )}
    >
      <Link href="/" className="flex items-center gap-2">
        <img
          src="/logo.png"
          alt="My Clinics logo"
          className={cn(
            "h-8 w-8 rounded-md object-contain",
            hero
              ? "bg-white shadow-sm"
              : "bg-muted ring-border size-8 ring-1"
          )}
        />
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            hero ? "text-white drop-shadow-sm" : "text-foreground"
          )}
        >
          My Clinics
        </span>
      </Link>
      <div
        className={cn(
          "hidden items-center gap-8 text-sm font-medium md:flex",
          hero ? "text-white/90" : "text-muted-foreground"
        )}
      >
        <Link
          href="/blog"
          className={cn(
            "transition",
            hero ? "hover:text-white" : "hover:text-foreground"
          )}
        >
          Blog
        </Link>
        <a
          href="/login"
          className={cn(
            "transition",
            hero ? "hover:text-white" : "hover:text-foreground"
          )}
        >
          Login
        </a>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className={cn(
            "hidden text-sm font-medium transition sm:block",
            hero ? "text-white/90 hover:text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sign in
        </Link>
        <Link
          href="/signup/clinic"
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold shadow-md transition",
            hero
              ? "bg-white text-black hover:bg-white/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
