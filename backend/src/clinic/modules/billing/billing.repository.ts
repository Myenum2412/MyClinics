import {
  endOfDayKolkata,
  now as nowFn,
  startOfDayKolkata,
  todayISO,
} from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import type { BillDoc } from "@/clinic/modules/billing/billing.schema";

/**
 * Billing repository — doctor-patient scoped:
 *   doctor  → doctorId: ctx.doctorId (bills for own patients)
 *   patient → patientId: ctx.patientId (own bills only)
 */
export class BillRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    private readonly scope: {
      role: string;
      doctorId: string | null;
      patientId: string | null;
    }
  ) {}

  private collection() {
    return this.db.collection<BillDoc>("clc_bills");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    const filter: Record<string, unknown> = { ...base };
    if (this.scope.role === "doctor") {
      filter.doctorId = this.scope.doctorId ?? null;
    }
    if (this.scope.role === "patient") {
      filter.patientId = this.scope.patientId ?? null;
    }
    return { clinicId: this.clinicId, ...filter };
  }

  async findByBillId(billId: string): Promise<WithId<BillDoc> | null> {
    return this.collection().findOne(this.scoped({ billId }));
  }

  async list(query: {
    patientId?: string;
    status?: string;
    from?: string;
    to?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<BillDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.patientId) filter.patientId = query.patientId;
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: startOfDayKolkata(query.from) } : {}),
        ...(query.to ? { $lte: endOfDayKolkata(query.to) } : {}),
      };
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  /** Next sequential bill number for this clinic (B-YYYY-####). */
  async nextBillNumber(): Promise<string> {
    const year = Number(todayISO().slice(0, 4));
    const prefix = `B-${year}-`;
    const latest = await this.collection()
      .find({ clinicId: this.clinicId, billNumber: { $regex: `^${prefix}` } })
      .sort({ billNumber: -1 })
      .limit(1)
      .toArray();
    const lastNumber = latest[0]?.billNumber ?? `${prefix}0000`;
    const seq = parseInt(lastNumber.slice(prefix.length), 10) || 0;
    return `${prefix}${String(seq + 1).padStart(4, "0")}`;
  }

  async insert(doc: Omit<BillDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">): Promise<WithId<BillDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByBillId(doc.billId)) as WithId<BillDoc>;
  }

  async update(billId: string, patch: Record<string, unknown>): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ billId }),
      { $set: { ...patch, updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(billId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ billId }),
      { $set: { status: "void", deletedAt: nowFn(), updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }
}