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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request);
  const isPublic = PUBLIC_PATHS.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
  const isClinicWorkspace = pathname === "/clinic" || pathname.startsWith("/clinic/");
  const isAdminWorkspace = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!session) {
    if (isClinicWorkspace || isAdminWorkspace) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isPublic) {
    const url = new URL(session.role === "platform_admin" ? "/admin" : "/clinic", request.url);
    return NextResponse.redirect(url);
  }

  if (isAdminWorkspace && session.role !== "platform_admin") {
    return NextResponse.redirect(new URL("/clinic", request.url));
  }

  if (isClinicWorkspace && session.role === "platform_admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/clinic/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
    "/signup/:path*",
  ],
};