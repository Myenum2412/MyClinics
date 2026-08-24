import { now as nowFn, parseLocalDate } from "@/clinic/core/datetime";
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
  derivePaymentStatus,
  type BillDoc,
} from "@/clinic/modules/billing/billing.schema";
import { queueBillWhatsAppNotification } from "@/services/whatsapp/bill-notification.service";

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
    const totals = computeBillTotals(input.items);

    // Legacy global discount/taxPercent fallback applied on top of the
    // per-item totals (only when explicitly provided and non-zero).
    let discount = totals.discount;
    let taxAmount = totals.taxAmount;
    if ((input.discount ?? 0) > 0) {
      discount = Math.min(input.discount!, totals.subtotal);
    }
    if ((input.taxPercent ?? 0) > 0) {
      taxAmount += Math.round((totals.subtotal - discount) * (input.taxPercent! / 100) * 100) / 100;
    }
    const total = Math.round((totals.subtotal - discount + taxAmount) * 100) / 100;

    const amountPaid = Math.min(Math.max(input.amountPaid ?? 0, 0), total);
    const paymentStatus = derivePaymentStatus(total, amountPaid);
    const status = input.status ?? (paymentStatus === "paid" && total > 0 ? "paid" : "draft");
    const now = nowFn();

    const bill = await this.repo(ctx).insert({
      billId: generateBillId(),
      billNumber: await this.repo(ctx).nextBillNumber(),
      patientId: input.patientId,
      doctorId,
      items: input.items.map((item) => {
        const gross = item.quantity * item.unitPrice;
        const itemDiscount = Math.min(Math.max(item.discount ?? 0, 0), gross);
        const itemTax = Math.round((gross - itemDiscount) * ((item.taxPercent ?? 0) / 100) * 100) / 100;
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: itemDiscount,
          taxPercent: item.taxPercent ?? 0,
          lineTotal: Math.round((gross - itemDiscount + itemTax) * 100) / 100,
        };
      }),
      subtotal: totals.subtotal,
      discount: Math.round(discount * 100) / 100,
      taxPercent: input.taxPercent ?? 0,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total,
      status,
      paymentType: input.paymentType ?? null,
      amountPaid,
      balanceDue: Math.round((total - amountPaid) * 100) / 100,
      paymentStatus,
      paymentMethod: input.paymentType ?? null,
      invoiceDate: input.invoiceDate ? parseLocalDate(input.invoiceDate) : now,
      dueDate: input.dueDate ? parseLocalDate(input.dueDate) : null,
      paidAt: status === "paid" ? now : null,
      notes: input.notes ?? null,
      internalNotes: input.internalNotes ?? null,
      reference: input.reference ?? null,
      sendMethod: input.sendMethod ?? "none",
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

    // Fire-and-forget WhatsApp delivery when the bill asked for it
    // (sendMethod: "whatsapp"). Never throws.
    if ((input.sendMethod ?? "none") === "whatsapp") {
      await queueBillWhatsAppNotification(this.db, { clinicId, bill, patient });
    }

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
      // Paid bills are financially frozen, but metadata/status transitions
      // (e.g. voiding a paid bill) must remain possible.
      const FINANCIAL_FIELDS = [
        "items",
        "discount",
        "taxPercent",
        "amountPaid",
        "invoiceDate",
        "dueDate",
        "paymentType",
      ] as const;
      const attemptedFinancial = FINANCIAL_FIELDS.some((f) => input[f] !== undefined);
      if (attemptedFinancial) {
        throw new ConflictError("Paid bills cannot be modified. Void the bill instead.");
      }
    }

    const items = input.items ?? existing.items;
    const totals = computeBillTotals(items);

    // Per-item totals, plus the legacy global discount/taxPercent fallback.
    const discount =
      input.discount !== undefined
        ? Math.min(Math.max(input.discount, 0), totals.subtotal)
        : totals.discount;
    const globalTaxPercent = input.taxPercent ?? existing.taxPercent ?? 0;
    const globalTax = Math.round((totals.subtotal - discount) * (globalTaxPercent / 100) * 100) / 100;
    const taxAmount = Math.max(totals.taxAmount, globalTax);
    const total = Math.round((totals.subtotal - discount + taxAmount) * 100) / 100;

    const amountPaid =
      input.amountPaid !== undefined
        ? Math.min(Math.max(input.amountPaid, 0), total)
        : (existing.amountPaid ?? 0);
    const paymentStatus = derivePaymentStatus(total, amountPaid);
    const balanceDue = Math.round((total - amountPaid) * 100) / 100;

    const patch: Record<string, unknown> = {
      subtotal: totals.subtotal,
      discount: Math.round(discount * 100) / 100,
      taxPercent: input.taxPercent ?? existing.taxPercent ?? 0,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total,
      amountPaid,
      balanceDue,
      paymentStatus,
      paymentType:
        input.paymentType !== undefined ? input.paymentType : (existing.paymentType ?? null),
    };

    if (input.items !== undefined) {
      patch.items = items.map((item) => {
        const gross = item.quantity * item.unitPrice;
        const itemDiscount = Math.min(Math.max(item.discount ?? 0, 0), gross);
        const itemTax = Math.round((gross - itemDiscount) * ((item.taxPercent ?? 0) / 100) * 100) / 100;
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: itemDiscount,
          taxPercent: item.taxPercent ?? 0,
          lineTotal: Math.round((gross - itemDiscount + itemTax) * 100) / 100,
        };
      });
    }
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.internalNotes !== undefined) patch.internalNotes = input.internalNotes;
    if (input.reference !== undefined) patch.reference = input.reference;
    if (input.sendMethod !== undefined) patch.sendMethod = input.sendMethod;
    if (input.invoiceDate !== undefined) {
      patch.invoiceDate = parseLocalDate(input.invoiceDate);
    }
    if (input.dueDate !== undefined) {
      patch.dueDate = input.dueDate ? parseLocalDate(input.dueDate) : null;
    }
    if (input.paymentMethod !== undefined) patch.paymentMethod = input.paymentMethod;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "paid") {
        patch.paidAt = nowFn();
        patch.paymentMethod =
          input.paymentType ?? input.paymentMethod ?? existing.paymentMethod ?? "cash";
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