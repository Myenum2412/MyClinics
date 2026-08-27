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
  updateSettingsSchema,
  createMedicineSchema,
  listMedicinesSchema,
  createSupplierSchema,
  listInventorySchema,
  listMovementsSchema,
  createPurchaseSchema,
  listPurchasesSchema,
  createSaleSchema,
  listSalesSchema,
  createAdjustmentSchema,
  createTransferSchema,
  createReturnSchema,
  writeOffSchema,
  addOpeningStockSchema,
  bulkActionSchema,
  reviewAdjustmentSchema,
  reviewTransferSchema,
  reportQuerySchema,
  receivePurchaseSchema,
} from "@/clinic/modules/pharmacy/pharmacy.dto";
import {
  settingsToPublic,
  medicineToPublic,
  inventoryToPublic,
  movementToPublic,
  supplierToPublic,
  purchaseToPublic,
  saleToPublic,
  adjustmentToPublic,
  transferToPublic,
  returnToPublic,
} from "@/clinic/modules/pharmacy/pharmacy.schema";
import { PharmacyService } from "@/clinic/modules/pharmacy/pharmacy.service";

function strip<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const { _id, clinicId, deletedAt, ...rest } = doc as Record<string, unknown>;
  void _id;
  void clinicId;
  void deletedAt;
  return rest;
}

export class PharmacyController {
  private service(db: Db): PharmacyService {
    return new PharmacyService(db);
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  async getSettings(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const settings = await this.service(db).getSettings(ctx);
    return reply.send(settings ? settingsToPublic(settings) : null);
  }

  async updateSettings(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = updateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid settings");
    }
    const db = await getDb();
    const settings = await this.service(db).updateSettings(ctx, parsed.data);
    return reply.send(settingsToPublic(settings));
  }

  // ── Medicines ────────────────────────────────────────────────────────────
  async listMedicines(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listMedicinesSchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listMedicines(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(medicineToPublic), total: result.total });
  }

  async getMedicine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { medicineId } = request.params as { medicineId: string };
    const db = await getDb();
    const med = await this.service(db).getMedicine(ctx, medicineId);
    return reply.send(medicineToPublic(med));
  }

  async createMedicine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createMedicineSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid medicine");
    const db = await getDb();
    const med = await this.service(db).createMedicine(ctx, parsed.data);
    return reply.code(201).send(medicineToPublic(med));
  }

  async updateMedicine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { medicineId } = request.params as { medicineId: string };
    const parsed = createMedicineSchema.partial().safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid medicine");
    const db = await getDb();
    const med = await this.service(db).updateMedicine(ctx, medicineId, parsed.data);
    return reply.send(medicineToPublic(med));
  }

  async deleteMedicine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { medicineId } = request.params as { medicineId: string };
    const db = await getDb();
    await this.service(db).deleteMedicine(ctx, medicineId);
    return reply.send({ ok: true });
  }

  async bulkMedicines(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = bulkActionSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid bulk action");
    const db = await getDb();
    const res = await this.service(db).bulkMedicines(ctx, parsed.data);
    return reply.send(res);
  }

  // ── Inventory ──────────────────────────────────────────────────────────────
  async listInventory(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listInventorySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listInventory(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map((i) => strip(i as unknown as Record<string, unknown>)), total: result.total });
  }

  async getInventory(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { inventoryId } = request.params as { inventoryId: string };
    const db = await getDb();
    const inv = await this.service(db).getInventory(ctx, inventoryId);
    return reply.send(inventoryToPublic(inv));
  }

  async addOpeningStock(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = addOpeningStockSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid opening stock");
    const db = await getDb();
    const res = await this.service(db).addOpeningStock(ctx, parsed.data);
    return reply.send(res);
  }

  async writeOff(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = writeOffSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid write-off");
    const db = await getDb();
    await this.service(db).writeOff(ctx, parsed.data);
    return reply.send({ ok: true });
  }

  // ── Stock Movements ──────────────────────────────────────────────────────────
  async listMovements(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listMovementsSchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listMovements(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map((m) => strip(m as unknown as Record<string, unknown>)), total: result.total });
  }

  // ── Suppliers ──────────────────────────────────────────────────────────────
  async listSuppliers(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const q = request.query as Record<string, unknown>;
    const search = typeof q.search === "string" ? q.search : undefined;
    const status = typeof q.status === "string" ? q.status : undefined;
    const { skip, limit } = parsePagination(q);
    const db = await getDb();
    const result = await this.service(db).listSuppliers(ctx, { search, status, skip, limit });
    return reply.send({ items: result.items.map(supplierToPublic), total: result.total });
  }

  async getSupplier(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { supplierId } = request.params as { supplierId: string };
    const db = await getDb();
    const sup = await this.service(db).getSupplier(ctx, supplierId);
    return reply.send(supplierToPublic(sup));
  }

  async createSupplier(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createSupplierSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid supplier");
    const db = await getDb();
    const sup = await this.service(db).createSupplier(ctx, parsed.data);
    return reply.code(201).send(supplierToPublic(sup));
  }

  async updateSupplier(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { supplierId } = request.params as { supplierId: string };
    const parsed = createSupplierSchema.partial().safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid supplier");
    const db = await getDb();
    const sup = await this.service(db).updateSupplier(ctx, supplierId, parsed.data);
    return reply.send(supplierToPublic(sup));
  }

  async deleteSupplier(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { supplierId } = request.params as { supplierId: string };
    const db = await getDb();
    await this.service(db).deleteSupplier(ctx, supplierId);
    return reply.send({ ok: true });
  }

  // ── Purchases ──────────────────────────────────────────────────────────────
  async listPurchases(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listPurchasesSchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listPurchases(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(purchaseToPublic), total: result.total });
  }

  async getPurchase(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { purchaseId } = request.params as { purchaseId: string };
    const db = await getDb();
    const p = await this.service(db).getPurchase(ctx, purchaseId);
    return reply.send(purchaseToPublic(p));
  }

  async createPurchase(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createPurchaseSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid purchase");
    const db = await getDb();
    const p = await this.service(db).createPurchase(ctx, parsed.data);
    return reply.code(201).send(purchaseToPublic(p));
  }

  async receivePurchase(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { purchaseId } = request.params as { purchaseId: string };
    const parsed = receivePurchaseSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid input");
    const db = await getDb();
    await this.service(db).receivePurchase(ctx, purchaseId, parsed.data);
    return reply.send({ ok: true });
  }

  // ── Sales ──────────────────────────────────────────────────────────────────
  async listSales(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listSalesSchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listSales(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(saleToPublic), total: result.total });
  }

  async getSale(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { saleId } = request.params as { saleId: string };
    const db = await getDb();
    const s = await this.service(db).getSale(ctx, saleId);
    return reply.send(saleToPublic(s));
  }

  async createSale(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createSaleSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid sale");
    const db = await getDb();
    const s = await this.service(db).createSale(ctx, parsed.data);
    return reply.code(201).send(saleToPublic(s));
  }

  // ── Adjustments ──────────────────────────────────────────────────────────────
  async listAdjustments(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const q = request.query as Record<string, unknown>;
    const status = typeof q.status === "string" ? q.status : undefined;
    const { skip, limit } = parsePagination(q);
    const db = await getDb();
    const result = await this.service(db).listAdjustments(ctx, { status, skip, limit });
    return reply.send({ items: result.items.map(adjustmentToPublic), total: result.total });
  }

  async createAdjustment(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createAdjustmentSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid adjustment");
    const db = await getDb();
    const a = await this.service(db).createAdjustment(ctx, parsed.data);
    return reply.code(201).send(adjustmentToPublic(a));
  }

  async reviewAdjustment(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { adjustmentId } = request.params as { adjustmentId: string };
    const parsed = reviewAdjustmentSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid review");
    const db = await getDb();
    await this.service(db).reviewAdjustment(ctx, adjustmentId, parsed.data.decision, parsed.data.notes ?? null);
    return reply.send({ ok: true });
  }

  // ── Transfers ──────────────────────────────────────────────────────────────
  async listTransfers(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const q = request.query as Record<string, unknown>;
    const status = typeof q.status === "string" ? q.status : undefined;
    const { skip, limit } = parsePagination(q);
    const db = await getDb();
    const result = await this.service(db).listTransfers(ctx, { status, skip, limit });
    return reply.send({ items: result.items.map(transferToPublic), total: result.total });
  }

  async createTransfer(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createTransferSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid transfer");
    const db = await getDb();
    const t = await this.service(db).createTransfer(ctx, parsed.data);
    return reply.code(201).send(transferToPublic(t));
  }

  async reviewTransfer(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { transferId } = request.params as { transferId: string };
    const parsed = reviewTransferSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid review");
    const db = await getDb();
    await this.service(db).reviewTransfer(ctx, transferId, parsed.data.decision, parsed.data.notes ?? null);
    return reply.send({ ok: true });
  }

  // ── Returns ──────────────────────────────────────────────────────────────
  async listReturns(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const q = request.query as Record<string, unknown>;
    const type = typeof q.type === "string" ? q.type : undefined;
    const { skip, limit } = parsePagination(q);
    const db = await getDb();
    const result = await this.service(db).listReturns(ctx, { type, skip, limit });
    return reply.send({ items: result.items.map(returnToPublic), total: result.total });
  }

  async createReturn(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createReturnSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid return");
    const db = await getDb();
    const r = await this.service(db).createReturn(ctx, parsed.data);
    return reply.code(201).send(returnToPublic(r));
  }

  // ── Dashboard / Alerts / Reports ───────────────────────────────────────────
  async getDashboard(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const dashboard = await this.service(db).getDashboard(ctx);
    return reply.send(dashboard);
  }

  async getAlerts(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const alerts = await this.service(db).getAlerts(ctx);
    return reply.send(alerts);
  }

  async downloadReport(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = reportQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid report query");
    const db = await getDb();
    const report = await this.service(db).buildReport(ctx, parsed.data.type, {
      from: parsed.data.from,
      to: parsed.data.to,
      category: parsed.data.category,
      supplierId: parsed.data.supplierId,
      format: parsed.data.format,
    });
    if (report.contentType.includes("pdf")) {
      return reply
        .type("application/pdf")
        .header("Content-Disposition", `attachment; filename="${report.filename}"`)
        .send(report.data);
    }
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${report.filename}"`)
      .send(report.data);
  }
}
