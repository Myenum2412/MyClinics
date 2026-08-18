import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { createBillSchema, listBillsSchema, updateBillSchema } from "@/clinic/modules/billing/billing.dto";
import { billToPublic } from "@/clinic/modules/billing/billing.schema";
import { BillingService } from "@/clinic/modules/billing/billing.service";

export class BillingController {
  private service(db: Db): BillingService {
    return new BillingService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createBillSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid bill data");
    }
    const db = await getDb();
    const bill = await this.service(db).createBill(ctx, parsed.data);
    return reply.code(201).send(billToPublic(bill));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listBillsSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listBills(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(billToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { billId } = request.params as { billId: string };
    const db = await getDb();
    const bill = await this.service(db).getBill(ctx, billId);
    return reply.send(billToPublic(bill));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { billId } = request.params as { billId: string };
    const parsed = updateBillSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid bill data");
    }
    const db = await getDb();
    const bill = await this.service(db).updateBill(ctx, billId, parsed.data);
    return reply.send(billToPublic(bill));
  }

  async void(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { billId } = request.params as { billId: string };
    const db = await getDb();
    await this.service(db).voidBill(ctx, billId);
    return reply.send({ ok: true });
  }
  /** Patient portal: lists only the caller's OWN billing (scoped in the service). */
  async getMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listBills(ctx, { skip, limit });
    return reply.send({ items: result.items.map(billToPublic), total: result.total });
  }
}
