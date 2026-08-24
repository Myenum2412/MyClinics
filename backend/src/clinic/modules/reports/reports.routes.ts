import type { FastifyInstance } from "fastify";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";
import { generateBusinessInsights, type ReportMetrics } from "./reports.service";

export function registerReportsRoutes(app: FastifyInstance): void {
  app.post(
    "/api/clinics/:clinicId/reports/ai-insights",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => {
      const body = request.body as ReportMetrics | null;
      if (!body || typeof body.totalRevenue !== "number") {
        return reply.code(400).send({ error: "Invalid metrics" });
      }
      const result = await generateBusinessInsights(body);
      return reply.send(result);
    }
  );

  app.get(
    "/api/clinics/:clinicId/reports/summary",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => {
      const { clinicId } = request.params as { clinicId: string };
      return reply.send({ ok: true, clinicId, message: "Use POST /ai-insights with metrics. NVIDIA_MODEL=" + (process.env.NVIDIA_MODEL ?? "minimaxai/minimax-m3") });
    }
  );
}
