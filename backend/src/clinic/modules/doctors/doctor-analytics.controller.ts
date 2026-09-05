import type { FastifyReply, FastifyRequest } from "fastify";
import { getAppointmentsDb } from "@/lib/db-pools";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { doctorOverviewQuerySchema } from "@/clinic/modules/doctors/doctor-analytics.dto";
import { DoctorAnalyticsService } from "@/clinic/modules/doctors/doctor-analytics.service";

export class DoctorAnalyticsController {
  async getOverview(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { doctorId } = request.params as { doctorId: string };
    const parsed = doctorOverviewQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid date range");
    }
    const db = await getAppointmentsDb();
    const service = new DoctorAnalyticsService(db);
    const result = await service.getOverview(ctx, doctorId, parsed.data);
    return reply.send(result);
  }
}
