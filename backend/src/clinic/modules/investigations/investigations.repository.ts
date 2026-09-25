import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import type { InvestigationDoc } from "@/clinic/modules/investigations/investigations.schema";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";

/**
 * Investigation repository — doctor-patient scoped:
 *   doctor  → doctorId: ctx.doctorId (own investigations only)
 *   patient → patientId: ctx.patientId (own investigations only)
 *   staff / admin roles → whole clinic
 */
export class InvestigationRepository {
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
    return this.db.collection<InvestigationDoc>(
      CLINIC_COLLECTIONS.investigations
    );
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    const filter: Record<string, unknown> = { ...base };
    if (this.scope.role === "doctor") {
      if (this.scope.doctorId) filter.doctorId = this.scope.doctorId;
    }
    if (this.scope.role === "patient") {
      filter.patientId = this.scope.patientId ?? null;
    }
    return { clinicId: this.clinicId, ...filter };
  }

  async findByInvestigationId(
    investigationId: string
  ): Promise<WithId<InvestigationDoc> | null> {
    return this.collection().findOne(this.scoped({ investigationId }));
  }

  async list(query: {
    q?: string;
    patientId?: string;
    status?: string;
    from?: string;
    to?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<InvestigationDoc>[], number]> {
    const filter: Record<string, unknown> = {
      status: { $ne: "deleted" },
    };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.visitDate = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    if (query.q) {
      filter.$or = [
        { title: { $regex: query.q, $options: "i" } },
        { patientName: { $regex: query.q, $options: "i" } },
        { notes: { $regex: query.q, $options: "i" } },
      ];
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ visitDate: -1, createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<InvestigationDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<InvestigationDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByInvestigationId(
      doc.investigationId
    )) as WithId<InvestigationDoc>;
  }

  async update(
    investigationId: string,
    patch: Record<string, unknown>
  ): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ investigationId }),
      { $set: { ...patch, updatedAt: nowFn() } }
    );
    return result.matchedCount === 1;
  }

  async softDelete(investigationId: string): Promise<boolean> {
    const result = await this.collection().updateOne(
      this.scoped({ investigationId }),
      {
        $set: {
          status: "deleted",
          deletedAt: nowFn(),
          updatedAt: nowFn(),
        },
      }
    );
    return result.matchedCount === 1;
  }
}
