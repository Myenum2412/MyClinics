import type { FastifyInstance } from "fastify";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";
import { getDb } from "@/lib/db-pools";
import { QuickAddService } from "./quick-add.service";
import { quickAddSchema } from "./quick-add.dto";

/**
 * Quick Add — single submit, single notification with full data
 * POST /api/clinics/:clinicId/quick-add
 * Body: { patientId, doctorId, appointment?, record?, prescription? }
 * Sends ONE WhatsApp notification containing all filled sections (for /clinic/quick-add only).
 */
export function registerQuickAddRoutes(app: FastifyInstance): void {
  app.post(
    "/api/clinics/:clinicId/quick-add",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => {
      const { clinicId } = request.params as { clinicId: string };
      const parsed = quickAddSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      // Ensure URL clinicId matches body context (scope will validate)
      const db = await getDb();
      const service = new QuickAddService(db);
      const ctx: any = (request as any).clinic; // set by applyClinicScope
      // clinicId from URL is already validated by requireClinicAccess
      const result = await service.createQuickAdd(ctx, parsed.data);
      return reply.code(201).send({ ok: true, ...result });
    }
  );
}
