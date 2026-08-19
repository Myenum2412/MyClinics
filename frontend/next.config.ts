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
  // indiapins reads its pincode data shards with readFileSync at runtime,
  // which Next.js file tracing cannot discover statically — include them
  // explicitly so the serverless function gets the data (Vercel prod).
  outputFileTracingIncludes: {
    "/pincode/\\[pincode\\]": ["./node_modules/indiapins/data/**/*"],
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