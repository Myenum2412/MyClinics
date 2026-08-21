import type { Metadata, Viewport } from "next";
import Script from "next/script";
import PwaRegister from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Clinics — Clinic Management, Appointments & Patient Records",
    template: "%s — My Clinics",
  },
  description:
    "My Clinics is a complete clinic management platform for doctors and patients — book appointments, manage medicines, track billing and store medical reports securely.",
  applicationName: "My Clinics",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "My Clinics",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <PwaRegister />
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
