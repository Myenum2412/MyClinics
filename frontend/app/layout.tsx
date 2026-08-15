import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Clinics — Clinic Management, Appointments & Patient Records",
    template: "%s — My Clinics",
  },
  description:
    "My Clinics is a complete clinic management platform for doctors and patients — book appointments, manage medicines, track billing and store medical reports securely.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
