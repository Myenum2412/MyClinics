import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db-pools";
import { requireClinicAccess } from "@/clinic/core/scope";
import { DashboardService } from "./dashboard.service";

export function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/clinics/:clinicId/dashboard", { preHandler: [requireClinicAccess] }, async (request) => {
    const db = await getDb();
    const svc = new DashboardService(db);
    return svc.getSummary(request.clinic!);
  });
}
