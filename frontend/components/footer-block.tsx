import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Book Appointment", href: "/#book" },
  { label: "Login", href: "/login" },
  { label: "Create Account", href: "/signup" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export default function FooterBlock() {
  return (
    <section className="flex w-full flex-col items-stretch bg-background text-foreground">
      <Separator />
      <footer className="w-full px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="My Clinics logo"
              className="size-7 shrink-0 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight">My Clinics</span>
              <span className="text-xs text-muted-foreground">
                Healthcare above the clouds.
              </span>
            </div>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-1"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="shrink-0 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} My Clinics
          </p>
        </div>
      </footer>
    </section>
  );
}