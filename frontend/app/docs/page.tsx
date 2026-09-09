import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Documentation — My Clinics",
  description: "Guides and documentation for My Clinics — book appointments, manage your clinic, and use WhatsApp booking.",
};

export default function DocsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1" />
      <SiteFooter />
    </div>
  );
}
