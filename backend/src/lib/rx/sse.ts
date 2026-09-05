/**
 * Server-Sent Events over RxJS Observable
 * https://reactivex.io/documentation/observable.html
 *
 * Turns any Observable<ClinicEvent> into an SSE stream for the dashboard's
 * live queue / appointment tables. The frontend subscribes via EventSource
 * and gets push updates without polling.
 *
 * Each SSE frame: `data: {json}\n\n`
 * Keeps HTTP connection alive via periodic comment (`: ping\n\n`).
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import type { Observable, Subscription } from "rxjs";
import type { ClinicEvent } from "./event-bus";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function sseFrame(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Pipes an Observable into an SSE response. Handles back-pressure via
 * Observable subscription lifecycle and cleans up on client disconnect.
 */
export function streamAsSSE(
  req: FastifyRequest,
  reply: FastifyReply,
  source$: Observable<ClinicEvent>,
  opts: { heartbeatMs?: number } = {},
): void {
  const { heartbeatMs = 15_000 } = opts;
  reply.raw.writeHead(200, SSE_HEADERS);
  // Flush headers immediately so the browser's EventSource connects.
  if (typeof (reply.raw as unknown as { flushHeaders?: () => void }).flushHeaders === "function") {
    (reply.raw as unknown as { flushHeaders: () => void }).flushHeaders();
  }
  reply.raw.write(": connected\n\n");

  const heartbeat = setInterval(() => {
    reply.raw.write(": ping\n\n");
  }, heartbeatMs);

  const sub: Subscription = source$.subscribe({
    next(event) {
      if (!reply.raw.writableEnded) reply.raw.write(sseFrame(event));
    },
    error(err) {
      if (!reply.raw.writableEnded) reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
    },
  });

  const cleanup = () => {
    clearInterval(heartbeat);
    sub.unsubscribe();
    if (!reply.raw.writableEnded) reply.raw.end();
  };

  req.raw.on("close", cleanup);
  reply.raw.on("close", cleanup);
}
