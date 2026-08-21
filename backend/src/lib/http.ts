import type { FastifyReply, FastifyRequest } from "fastify";

/** Parses query string params from a Fastify request URL. */
export function searchParams(request: FastifyRequest): URLSearchParams {
  const raw = request.url.includes("?") ? request.url.split("?")[1] : "";
  return new URLSearchParams(raw);
}

/** Logs the error and replies with the standard 500 payload (incl. detail). */
export function handleError(reply: FastifyReply, error: unknown, context: string): void {
  console.error(`${context} error`, error);
  const detail = error instanceof Error ? error.message : String(error);
  reply.code(500).send({ error: `Something went wrong. Please try again. (${detail})` });
}

/** Reads and JSON-parses the request body safely. */
export function readBody(request: FastifyRequest): unknown {
  return request.body ?? {};
}