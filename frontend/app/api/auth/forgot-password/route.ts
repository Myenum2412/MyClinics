import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/server-api";

export async function POST(request: NextRequest) {
  const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
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
