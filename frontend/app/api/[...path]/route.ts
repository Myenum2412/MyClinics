export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_URL?.trim() ||
  (process.env.NODE_ENV === "production" ? "https://api.myclinic.myenum.in" : "http://localhost:3100");

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-connection", "transfer-encoding",
  "upgrade", "host", "content-length",
]);

async function proxy(req: Request, params: { path?: string[] }) {
  const path = params.path?.join("/") ?? "";

  const url = new URL(req.url);
  const target = `${BACKEND_URL}/api/${path}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers.set(k, v);
  });

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const resHeaders = new Headers();
    res.headers.forEach((v, k) => {
      // undici transparently decodes the upstream body, so a forwarded
      // content-encoding would make browsers gunzip plain JSON and abort.
      // (The auth proxy route already strips it for the same reason.)
      if (!HOP_BY_HOP.has(k.toLowerCase()) && k.toLowerCase() !== "content-encoding") {
        resHeaders.set(k, v);
      }
    });

    const buf = await res.arrayBuffer();
    // 204/304 are null-body statuses: constructing a Response with a body
    // throws ("Invalid response status code") and would surface as a 503.
    if (res.status === 204 || res.status === 304) {
      return new Response(null, { status: res.status, headers: resHeaders });
    }
    return new Response(buf, { status: res.status, headers: resHeaders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("abort");
    console.error(`[api-proxy] ${req.method} ${target} failed: ${msg}`);
    return new Response(
      JSON.stringify({
        error: isTimeout ? "Backend timeout" : "Backend unavailable",
        code: "BAD_GATEWAY",
        hint: "Please retry in a moment. If this persists, the API server may be restarting.",
      }),
      { status: 503, headers: { "content-type": "application/json", "retry-after": "10" } }
    );
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ path?: string[] }> }) { return proxy(req, await ctx.params); }
export async function POST(req: Request, ctx: { params: Promise<{ path?: string[] }> }) { return proxy(req, await ctx.params); }
export async function PUT(req: Request, ctx: { params: Promise<{ path?: string[] }> }) { return proxy(req, await ctx.params); }
export async function PATCH(req: Request, ctx: { params: Promise<{ path?: string[] }> }) { return proxy(req, await ctx.params); }
export async function DELETE(req: Request, ctx: { params: Promise<{ path?: string[] }> }) { return proxy(req, await ctx.params); }
export async function OPTIONS(req: Request, ctx: { params: Promise<{ path?: string[] }> }) { return proxy(req, await ctx.params); }
export async function HEAD(req: Request, ctx: { params: Promise<{ path?: string[] }> }) { return proxy(req, await ctx.params); }
