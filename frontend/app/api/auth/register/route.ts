import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/server-api";

// Relays to the API server (the /api/auth/* paths are intentionally excluded
// from the Next.js rewrite so next-auth's in-process handler stays untouched).
export async function POST(request: NextRequest) {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
    },
    body: await request.text(),
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
