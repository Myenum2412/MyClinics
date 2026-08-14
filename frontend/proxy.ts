import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPages = ["/login", "/signup", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const isPublic = publicPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
  const isDashboard = pathname.startsWith("/doctor");
  const isPatient = pathname.startsWith("/patient");

  if (!token && (isDashboard || isPatient)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (token && isPublic) {
    const url = new URL(
      token.role === "patient" ? "/patient" : "/doctor",
      request.url
    );
    return NextResponse.redirect(url);
  }

  const role = (token?.role as string | undefined) ?? "patient";

  if (token && isPatient && role !== "patient") {
    return NextResponse.redirect(new URL("/doctor", request.url));
  }

  if (token && isDashboard && role === "patient") {
    return NextResponse.redirect(new URL("/patient", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/doctor/:path*",
    "/patient/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
