import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Changelog from "@/components/changelog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — My Clinics",
  description:
    "Track all new features, updates and fixes for My Clinics. We ship fast — see what's new.",
};

export default function ChangelogPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Changelog />
      </main>
      <SiteFooter />
    </div>
  );
}
