import type { FastifyInstance } from "fastify";
import { lookup } from "indiapins";

/**
 * Public pincode lookup — offline India pincode directory.
 *
 * Registered before the clinic-scope middleware, so no auth is required
 * (same as the other platform routes). The frontend calls this via the
 * `/api/:path*` proxy rewrite (Next.js → Fastify).
 *
 *   GET /api/pincode/:pincode → { city, state }
 */
export function registerPincodeRoutes(app: FastifyInstance): void {
  app.get("/api/pincode/:pincode", async (request, reply) => {
    const { pincode } = request.params as { pincode: string };
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      return reply.code(400).send({ error: "Invalid pincode" });
    }

    try {
      const offices = lookup(pincode);
      if (!offices.length) {
        return reply.code(404).send({ error: "No results for this pincode" });
      }
      const office = offices[0];
      return reply.send({ city: office.district, state: office.state });
    } catch {
      return reply.code(502).send({ error: "Pincode lookup unavailable" });
    }
  });
}