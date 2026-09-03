import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const columns = [
  { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }, { label: "Sign In", href: "/login" }] },
  { title: "Support", links: [{ label: "Contact", href: "#contact" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
];

export function SiteFooter() {
  return (
    <footer className="w-full border-t bg-white px-4 py-10 sm:px-6 text-black">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex">
            <Image src="/logo.png" alt="My Clinics" width={140} height={40} className="h-9 w-auto" />
          </Link>
          <p className="mt-3 text-sm text-black">
            Complete clinic management — appointments, medicines, billing & reports.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold tracking-tight text-black">{col.title}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-black hover:text-black/70">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <Separator className="mt-10" />
      <p className="pt-6 text-sm text-black">&copy; 2026 My Clinics. All rights reserved.</p>
    </footer>
  );
}
