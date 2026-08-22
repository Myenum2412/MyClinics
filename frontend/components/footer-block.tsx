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
      <footer className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logobg.png"
              alt="My Clinics logo"
              className="size-8 shrink-0 object-contain"
            />
            <span className="text-xs text-muted-foreground">
              Healthcare above the clouds.
            </span>
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