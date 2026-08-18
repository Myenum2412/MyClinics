import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/mt/core/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/mt/core/errors";
import { mtPaged, parseMtPagination, queryParamsFromRecord } from "@/mt/core/pagination";
import { requirePatientAccess } from "@/mt/core/tenant-scope";
import {
  createMedicalRecordSchema,
  listMedicalRecordsQuerySchema,
  medicalRecordParamsSchema,
} from "@/mt/modules/medical-records/medical-records.dto";
import { MedicalRecordService } from "@/mt/modules/medical-records/medical-records.service";
import { mapMedicalRecord } from "@/mt/modules/medical-records/medical-records.schema";

export class MedicalRecordController {
  private async service() {
    return new MedicalRecordService(await getDb());
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role === "patient") {
      throw new ForbiddenError("Only clinic staff can create medical records");
    }

    const parsed = createMedicalRecordSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const record = await (await this.service()).createMedicalRecord(ctx, parsed.data);
    return reply.code(201).send({ record: mapMedicalRecord(record as never) });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const params = medicalRecordParamsSchema.safeParse(request.params);
    if (!params.success) throw new ValidationError("Invalid record id");

    const service = await this.service();
    const record = await service.getMedicalRecordById(ctx, params.data.recordId);

    await requirePatientAccess(request, reply, record.patientId);

    await writeAudit(await getDb(), ctx, {
      action: "access",
      entity: "medical_record",
      entityId: record.recordId,
      metadata: { patientId: record.patientId, title: record.title },
    });

    return reply.send({ record: mapMedicalRecord(record as never) });
  }

  async listByPatient(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const query = listMedicalRecordsQuerySchema.safeParse({
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
      mtPaged(items.map((r) => mapMedicalRecord(r as never)), total, pagination)
    );
  }
}