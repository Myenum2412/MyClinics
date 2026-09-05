import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError } from "@/clinic/core/errors";
import { getEventBus } from "@/lib/rx/event-bus";
import { streamAsSSE } from "@/lib/rx/sse";

/**
 * ReactiveX SSE endpoint — live clinic events as an Observable stream.
 *
 * GET /api/clinics/:clinicId/events/stream
 * Auth: clinic JWT (same as other tenant routes)
 * Returns: text/event-stream — each frame is a ClinicEvent JSON.
 *
 * Frontend:
 *   const es = new EventSource(`/api/clinics/${clinicId}/events/stream`);
 *   es.onmessage = e => console.log(JSON.parse(e.data));
 *
 * Or RxJS:
 *   fromEventSource<ClinicEvent>(`/api/clinics/${clinicId}/events/stream`)
 *     .pipe(filter(e => e.type === "queue.updated"))
 *     .subscribe(refreshQueue);
 */
export function registerEventStreamRoutes(app: FastifyInstance): void {
  app.get(
    "/:clinicId/events/stream",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.clinic;
      if (!ctx) throw new UnauthorizedError();
      const { clinicId } = request.params as { clinicId: string };
      // Tenant isolation: only stream your own clinic's events
      if (ctx.clinicId !== clinicId && ctx.role !== "platform_admin") {
        throw new UnauthorizedError("Clinic mismatch");
      }
      const bus = getEventBus();
      const source$ = bus.eventsFor(clinicId);
      streamAsSSE(request, reply, source$);
    },
  );

  // JSON snapshot: last events are not persisted; this is just the bus wiring.
  // For polling fallback, clients should use the regular queue/appointments endpoints.
  app.get(
    "/:clinicId/events/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.clinic;
      if (!ctx) throw new UnauthorizedError();
      const bus = getEventBus();
      return reply.send({ ok: true, observers: bus.observerCount() });
    },
  );
}
