import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/mt/core/errors";
import { updateClinicSchema } from "@/mt/modules/clinics/clinics.dto";
import { ClinicService } from "@/mt/modules/clinics/clinics.service";
import { mapClinic } from "@/mt/modules/clinics/clinics.repository";

export class ClinicController {
  /** GET /api/mt/clinics/me — every role can read their own clinic. */
  async getOwn(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    const clinic = await new ClinicService(await getDb()).getOwnClinic(ctx);
    return reply.send({ clinic: mapClinic(clinic) });
  }

  /** PATCH /api/mt/clinics/me — clinic_admin only. */
  async updateOwn(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only the clinic admin can update clinic settings");
    }

    const parsed = updateClinicSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const clinic = await new ClinicService(await getDb()).updateOwnClinic(ctx, parsed.data);
    return reply.send({ clinic: mapClinic(clinic) });
  }
}