import type { NextConfig } from "next";

// All /api/* traffic is proxied to the standalone API server (Fastify).
// The Clinic API (`/api/clinics/*`) authenticates with JWT bearer tokens,
// not cookies, so the proxy is a transparent pass-through. BACKEND_URL may
// be overridden via env; production defaults to the public API gateway on
// the application server (nginx -> Fastify).
const BACKEND_URL =
  process.env.BACKEND_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://api.myclinic.myenum.in"
    : "http://localhost:3100");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Never ship browser source maps  they leak original file paths and
  // source code to anyone who runs the bookmarklet / DevTools. The build
  // output (.next/build/*.map) is server-only.
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      // Favicons / manifest  never serve stale icons after an update.
      // Browsers + service workers cache /favicon.ico aggressively; a short
      // max-age + must-revalidate forces a conditional GET on every visit so
      // updated icons (regenerated from public/logo.png) appear immediately.
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/favicon.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/favicon-96x96.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      // Block direct access to source maps if they are ever emitted.
      {
        source: "/:path*.map",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      // Never index Next internals or private app areas  the bookmarklet you
      // ran greps every quoted "/..." string out of JS/HTML; these paths are
      // required for the browser to function but must not be crawled/indexed.
      {
        source: "/_next/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // Security headers for every route  reduces fingerprinting and
        // mitigates the information disclosure the bookmarklet relies on.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.myenum.in https://www.googletagmanager.com https://www.google-analytics.com https://*.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob: https://www.googletagmanager.com https://www.google-analytics.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://api.myclinic.myenum.in https://*.myenum.in https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://region1.google-analytics.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;