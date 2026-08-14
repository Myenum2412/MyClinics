import type { NextConfig } from "next";

// All /api/* traffic (except /api/auth, handled by next-auth in-process) is
// proxied to the standalone API server. The auth plugin in the backend
// re-verifies the same next-auth JWE session cookie.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3100";

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
