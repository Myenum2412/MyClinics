import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL?.trim() || "http://54.66.75.142:3100";

async function proxy(req: NextRequest, path: string[]) {
  const url = `${BACKEND_URL}/api/clinics/auth/${path.join("/")}${req.nextUrl.search}`;
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    if (["host", "connection", "content-length"].includes(k.toLowerCase())) return;
    headers[k] = v;
  });
  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength) init.body = Buffer.from(buf);
  }
  const res = await fetch(url, init);
  // Preserve redirects (Google OAuth 302)
  const outHeaders = new Headers();
  // Use getSetCookie() to preserve multiple Set-Cookie headers (clinic_token httpOnly)
  const setCookies = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  if (setCookies.length) {
    for (const c of setCookies) outHeaders.append("set-cookie", c);
  }
  res.headers.forEach((v, k) => {
    if (k.toLowerCase() === "content-encoding" || k.toLowerCase() === "set-cookie") return;
    outHeaders.set(k, v);
  });
  const body = await res.arrayBuffer();
  return new NextResponse(body, { status: res.status, headers: outHeaders });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
