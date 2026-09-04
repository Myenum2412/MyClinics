import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import CareersBlock from "@/components/blocks/careers-4";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers — My Clinics",
  description:
    "Join My Clinics — build the multi-tenant clinic platform with WhatsApp AI. Open roles in Engineering, AI, Design and Operations. Send resume to developer@myenum.in.",
};

export default function CareersPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <CareersBlock />
      </main>
      <SiteFooter />
    </div>
  );
}
