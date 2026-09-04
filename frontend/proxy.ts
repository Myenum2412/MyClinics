import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { CLINIC_TOKEN_KEY } from "@/lib/clinic-api";

/**
 * Route protection for the multi-tenant Clinic workspaces.
 *
 * Sessions are JWT bearer tokens (HS256) issued by the Clinic API
 * (`/api/clinics/auth/*`), mirrored into the `clinic_token` cookie by the
 * login/signup forms so this proxy can verify them server-side. The token
 * embeds clinicId + role; role gates are enforced here AND on the API.
 *
 *   /clinic/*  – any clinic role (doctor, staff, clinic_admin, patient)
 *   /admin/*   – platform_admin only
 */
const PUBLIC_PATHS = ["/login", "/signup", "/signup/clinic"];

async function verifySession(request: NextRequest): Promise<{
  role?: string;
  clinicId?: string | null;
} | null> {
  const token = request.cookies.get(CLINIC_TOKEN_KEY)?.value;
  if (!token) return null;
  const secret = process.env.CLINIC_JWT_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return {
      role: typeof payload.role === "string" ? payload.role : undefined,
      clinicId:
        typeof payload.clinicId === "string" ? payload.clinicId : null,
    };
  } catch {
    return null;
  }
}

function securityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.myenum.in https://www.googletagmanager.com https://www.google-analytics.com https://*.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob: https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.myclinic.myenum.in https://*.myenum.in https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://region1.google-analytics.com",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hard block for source maps — they leak file paths and original source.
  // The bookmarklet you ran fetches every <script src> and greps for
  // quoted "/..." strings; with maps disabled there is no map to fetch, but
  // this is defence-in-depth for any stray .map that reaches the edge.
  if (pathname.endsWith(".map")) {
    return new NextResponse(null, { status: 404 });
  }

  const session = await verifySession(request);
  const isPublic = PUBLIC_PATHS.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
  const isClinicWorkspace = pathname === "/clinic" || pathname.startsWith("/clinic/");
  const isAdminWorkspace = pathname === "/admin" || pathname.startsWith("/admin/");
  const isOrgMenu = pathname === "/orgmenu" || pathname.startsWith("/orgmenu/");

  if (!session) {
    if (isClinicWorkspace || isAdminWorkspace || isOrgMenu) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return securityHeaders(NextResponse.redirect(url));
    }
    return securityHeaders(NextResponse.next());
  }

  if (isPublic) {
    const url = new URL(session.role === "platform_admin" ? "/admin" : "/clinic", request.url);
    return securityHeaders(NextResponse.redirect(url));
  }

  if (isAdminWorkspace && session.role !== "platform_admin") {
    return securityHeaders(NextResponse.redirect(new URL("/clinic", request.url)));
  }

  if (isOrgMenu && session.role !== "platform_admin") {
    const dest = session.role === "patient" ? "/clinic/patient" : "/clinic";
    return securityHeaders(NextResponse.redirect(new URL(dest, request.url)));
  }

  if (isClinicWorkspace && session.role === "platform_admin") {
    return securityHeaders(NextResponse.redirect(new URL("/admin", request.url)));
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/clinic/:path*",
    "/admin/:path*",
    "/orgmenu/:path*",
    "/login",
    "/signup",
    "/signup/:path*",
    // Defence-in-depth: block source maps everywhere (they leak file paths).
    // Without this entry the proxy would not run for /_next/static/*.map.
    "/:path*.map",
  ],
};