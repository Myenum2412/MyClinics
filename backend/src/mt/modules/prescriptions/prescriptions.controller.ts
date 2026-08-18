import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/mt/core/audit";
import { ForbiddenError, ValidationError } from "@/mt/core/errors";
import { mtPaged, parseMtPagination, queryParamsFromRecord } from "@/mt/core/pagination";
import { requirePatientAccess } from "@/mt/core/tenant-scope";
import {
  createPrescriptionSchema,
  listPrescriptionsQuerySchema,
  prescriptionParamsSchema,
} from "@/mt/modules/prescriptions/prescriptions.dto";
import { PrescriptionService } from "@/mt/modules/prescriptions/prescriptions.service";
import { mapPrescription } from "@/mt/modules/prescriptions/prescriptions.schema";

export class PrescriptionController {
  private async service() {
    return new PrescriptionService(await getDb());
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role === "patient") {
      throw new ForbiddenError("Only clinic staff can create prescriptions");
    }

    const parsed = createPrescriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const prescription = await (await this.service()).createPrescription(ctx, parsed.data);
    return reply.code(201).send({ prescription: mapPrescription(prescription as never) });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const params = prescriptionParamsSchema.safeParse(request.params);
    if (!params.success) throw new ValidationError("Invalid prescription id");

    const service = await this.service();
    const prescription = await service.getPrescriptionById(ctx, params.data.prescriptionId);

    await requirePatientAccess(request, reply, prescription.patientId);

    await writeAudit(await getDb(), ctx, {
      action: "access",
      entity: "prescription",
      entityId: prescription.prescriptionId,
      metadata: { patientId: prescription.patientId },
    });

    return reply.send({ prescription: mapPrescription(prescription as never) });
  }

  async listByPatient(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const query = listPrescriptionsQuerySchema.safeParse({
      ...(request.query as Record<string, unknown>),
      patientId: (request.params as { patientId?: string }).patientId,
    });
    if (!query.success) {
      throw new ValidationError("Invalid query parameters");
    }

    await requirePatientAccess(request, reply, query.data.patientId);

    const pagination = parseMtPagination(queryParamsFromRecord(query.data as never));

    const { items, total } = await (
      await this.service()
    ).listByPatient(ctx, query.data.patientId, {
      skip: pagination.skip,
      limit: pagination.pageSize,
    });

    return reply.send(
      mtPaged(items.map((p) => mapPrescription(p as never)), total, pagination)
    );
  }
}