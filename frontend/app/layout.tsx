import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Clinics — Clinic Management, Appointments & Patient Records",
    template: "%s — My Clinics",
  },
  description:
    "My Clinics is a complete clinic management platform for doctors and patients — book appointments, manage medicines, track billing and store medical reports securely.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-EMHN4C4Q43"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-EMHN4C4Q43');
          `}
        </Script>
      </body>
    </html>
  );
}
