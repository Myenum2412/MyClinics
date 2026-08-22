import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import {
  createMedicineRecordSchema,
  listMedicineRecordsSchema,
  updateMedicineRecordSchema,
} from "@/clinic/modules/medicine/medicine.dto";
import { recordToPublic } from "@/clinic/modules/medicine/medicine.schema";
import { MedicineService } from "@/clinic/modules/medicine/medicine.service";

export class MedicineController {
  private service(db: Db): MedicineService {
    return new MedicineService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createMedicineRecordSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid medicine record data");
    }
    const db = await getDb();
    const record = await this.service(db).createRecord(ctx, parsed.data);
    return reply.code(201).send(recordToPublic(record));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listMedicineRecordsSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listRecords(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(recordToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { recordId } = request.params as { recordId: string };
    const db = await getDb();
    const record = await this.service(db).getRecord(ctx, recordId);
    return reply.send(recordToPublic(record));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { recordId } = request.params as { recordId: string };
    const parsed = updateMedicineRecordSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid medicine record data");
    }
    const db = await getDb();
    const record = await this.service(db).updateRecord(ctx, recordId, parsed.data);
    return reply.send(recordToPublic(record));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { recordId } = request.params as { recordId: string };
    const db = await getDb();
    await this.service(db).deleteRecord(ctx, recordId);
    return reply.send({ ok: true });
  }
  /** Patient portal: lists only the caller's OWN medicine records (scoped in the service). */
  async getMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listRecords(ctx, { skip, limit });
    return reply.send({ items: result.items.map(recordToPublic), total: result.total });
  }
}
