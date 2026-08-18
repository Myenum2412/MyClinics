import type { Db, WithId } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/clinic/core/errors";
import { generateBillId } from "@/clinic/core/ids";
import type { CreateBillInput, UpdateBillInput } from "@/clinic/modules/billing/billing.dto";
import { BillRepository } from "@/clinic/modules/billing/billing.repository";
import {
  computeBillTotals,
  type BillDoc,
} from "@/clinic/modules/billing/billing.schema";

export class BillingService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): BillRepository {
    return new BillRepository(this.db, requireClinicOf(ctx), {
      role: ctx.role,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
  }

  async createBill(ctx: ClinicContext, input: CreateBillInput): Promise<WithId<BillDoc>> {
    const clinicId = requireClinicOf(ctx);
    const patient = await this.db
      .collection(CLINIC_COLLECTIONS.patients)
      .findOne({ clinicId, patientId: input.patientId, status: { $ne: "deleted" } });
    if (!patient) {
      throw new BadRequestError("The patient does not exist in this clinic");
    }

    // A doctor may only bill for their own patients.
    if (ctx.role === "doctor" && patient.doctorId !== ctx.doctorId) {
      throw new ForbiddenError("You can only bill for your own patients");
    }

    const doctorId = input.doctorId ?? patient.doctorId ?? null;
    if (doctorId) {
      const doctor = await this.db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({ clinicId, doctorId, status: { $ne: "deleted" } });
      if (!doctor) {
        throw new BadRequestError("The doctor does not exist in this clinic");
      }
    }

    // Totals are ALWAYS computed server-side — client numbers are ignored.
    const totals = computeBillTotals(input.items, input.discount ?? 0, input.taxPercent ?? 0);
    const now = new Date();
    const status = input.status ?? "draft";

    const bill = await this.repo(ctx).insert({
      billId: generateBillId(),
      billNumber: await this.repo(ctx).nextBillNumber(),
      patientId: input.patientId,
      doctorId,
      items: input.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxPercent: totals.taxPercent,
      taxAmount: totals.taxAmount,
      total: totals.total,
      status,
      paymentMethod: status === "paid" ? "cash" : null,
      paidAt: status === "paid" ? now : null,
      notes: input.notes ?? null,
      createdBy: ctx.userId,
    });

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "bill",
      entityId: bill.billId,
      metadata: {
        patientId: input.patientId,
        billNumber: bill.billNumber,
        total: bill.total,
        status: bill.status,
      },
    });

    return bill;
  }

  async getBill(ctx: ClinicContext, billId: string): Promise<WithId<BillDoc>> {
    const bill = await this.repo(ctx).findByBillId(billId);
    if (!bill) throw new NotFoundError("Bill not found");
    return bill;
  }

  async listBills(
    ctx: ClinicContext,
    query: { patientId?: string; status?: string; from?: string; to?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.repo(ctx).list(query);
    return { items, total };
  }

  async updateBill(
    ctx: ClinicContext,
    billId: string,
    input: UpdateBillInput
  ): Promise<WithId<BillDoc>> {
    const repo = this.repo(ctx);
    const existing = await repo.findByBillId(billId);
    if (!existing) throw new NotFoundError("Bill not found");
    if (existing.status === "paid") {
      throw new ConflictError("Paid bills cannot be modified");
    }

    const patch: Record<string, unknown> = {};

    // Recompute totals whenever items/discount/tax change.
    const items = input.items ?? existing.items;
    const discount = input.discount ?? existing.discount;
    const taxPercent = input.taxPercent ?? existing.taxPercent;
    const totals = computeBillTotals(items, discount, taxPercent);

    if (input.items !== undefined) {
      patch.items = items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
      }));
    }
    if (input.discount !== undefined) patch.discount = totals.discount;
    if (input.taxPercent !== undefined) patch.taxPercent = totals.taxPercent;
    patch.subtotal = totals.subtotal;
    patch.taxAmount = totals.taxAmount;
    patch.total = totals.total;

    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.paymentMethod !== undefined) patch.paymentMethod = input.paymentMethod;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "paid") {
        patch.paidAt = new Date();
        patch.paymentMethod = input.paymentMethod ?? existing.paymentMethod ?? "cash";
      } else if (input.status === "draft" || input.status === "void") {
        patch.paidAt = null;
      }
    }

    if (Object.keys(patch).length === 0) return existing;

    const ok = await repo.update(billId, patch);
    if (!ok) throw new NotFoundError("Bill not found");

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "bill",
      entityId: billId,
      metadata: { fields: Object.keys(patch), total: patch.total },
    });

    const updated = await repo.findByBillId(billId);
    return updated ?? existing;
  }

  async voidBill(ctx: ClinicContext, billId: string): Promise<void> {
    const repo = this.repo(ctx);
    const existing = await repo.findByBillId(billId);
    if (!existing) throw new NotFoundError("Bill not found");

    await repo.softDelete(billId);

    await writeAudit(this.db, ctx, {
      action: "void",
      entity: "bill",
      entityId: billId,
      metadata: { billNumber: existing.billNumber, total: existing.total },
    });
  }
}