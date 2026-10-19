import type { Metadata } from "next";
import HeroSection6 from "@/components/hero-section-6";
import { FooterSection } from "@/components/footer-section";

export const metadata: Metadata = {
  title: {
    absolute: "Book Doctor Appointments Online | Clinic Management Software — My Clinics",
  },
  description:
    "Book doctor appointments online in under a minute. My Clinics is all-in-one clinic management software for appointments, patient records, prescriptions, billing & pharmacy — with WhatsApp booking & AI assistant. Trusted by 500+ clinics.",
  keywords: [
    "clinic management software",
    "clinic management system",
    "doctor appointment booking",
    "book doctor appointment online",
    "online doctor appointment",
    "patient record management",
    "EMR software",
    "clinic billing software",
    "pharmacy management software",
    "hospital management system",
    "My Clinics",
  ],
  openGraph: {
    title: "Book Doctor Appointments Online | Clinic Management Software — My Clinics",
    description:
      "Book doctor appointments online in under a minute. All-in-one clinic management software for appointments, records, billing, prescriptions & pharmacy with WhatsApp & AI booking.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Book Doctor Appointments Online | Clinic Management Software — My Clinics",
    description:
      "Book doctor appointments online in under a minute. All-in-one clinic management software with WhatsApp & AI booking.",
  },
};

export default function Home() {
  return (
    <>
      <HeroSection6 />
      <FooterSection />
    </>
  );
}
