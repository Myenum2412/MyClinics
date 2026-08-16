import type { NextConfig } from "next";

// All /api/* traffic (except /api/auth, handled by next-auth in-process) is
// proxied to the standalone API server. The auth plugin in the backend
// re-verifies the same next-auth JWE session cookie. BACKEND_URL may be
// overridden via env; production defaults to the public API gateway on the
// application server (nginx -> Fastify).
const BACKEND_URL =
  process.env.BACKEND_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://api.myclinic.myenum.in"
    : "http://localhost:3100");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Report uploads can reach ~50MB; the proxy clones/buffers request bodies.
    proxyClientMaxBodySize: "60mb",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path((?!auth/).*)",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
