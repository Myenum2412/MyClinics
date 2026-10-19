import type { Db, WithId } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { LeadDoc, LeadStatus } from "@/clinic/modules/leads/leads.schema";

/** Tenant-scoped lead repository. Every query is merged with clinicId. */
export class LeadRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string
  ) {}

  private collection() {
    return this.db.collection<LeadDoc>(CLINIC_COLLECTIONS.leads);
  }

  async getByLeadId(leadId: string): Promise<WithId<LeadDoc> | null> {
    return this.collection().findOne({ clinicId: this.clinicId, leadId });
  }

  async findBySourceRef(sourceRef: string): Promise<WithId<LeadDoc> | null> {
    return this.collection().findOne({ clinicId: this.clinicId, sourceRef });
  }

  async list(filter: { status?: LeadStatus; assignedTo?: string } = {}, limit = 100): Promise<WithId<LeadDoc>[]> {
    const q: Record<string, unknown> = { clinicId: this.clinicId };
    if (filter.status) q.status = filter.status;
    if (filter.assignedTo) q.assignedTo = filter.assignedTo;
    return this.collection().find(q).sort({ receivedAt: -1 }).limit(limit).toArray();
  }

  async count(filter: Record<string, unknown> = {}): Promise<number> {
    return this.collection().countDocuments({ clinicId: this.clinicId, ...filter });
  }

  /**
   * Average first-response time (ms), computed server-side. Previously the
   * service fetched up to 10k full lead documents and reduced them in JS.
   */
  async avgFirstResponseMs(): Promise<number | null> {
    const rows = await this.collection()
      .aggregate<{ avg: number | null }>([
        { $match: { clinicId: this.clinicId, firstResponseAt: { $type: "date" } } },
        { $project: { diff: { $subtract: ["$firstResponseAt", "$receivedAt"] } } },
        { $group: { _id: null, avg: { $avg: "$diff" } } },
      ])
      .toArray();
    const avg = rows[0]?.avg;
    return typeof avg === "number" && Number.isFinite(avg) ? Math.round(avg) : null;
  }

  async create(
    doc: Omit<LeadDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<LeadDoc>> {
    const now = nowFn();
    const r = await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.collection().findOne({ _id: r.insertedId })) as WithId<LeadDoc>;
  }

  async update(
    leadId: string,
    update: Partial<LeadDoc>
  ): Promise<boolean> {
    const r = await this.collection().updateOne(
      { clinicId: this.clinicId, leadId },
      { $set: { ...update, updatedAt: nowFn() } }
    );
    return r.matchedCount === 1;
  }

  async countBySource(): Promise<{ meta_facebook: number; meta_instagram: number; manual: number }> {
    const [fb, ig, manual] = await Promise.all([
      this.collection().countDocuments({ clinicId: this.clinicId, source: "meta_facebook" }),
      this.collection().countDocuments({ clinicId: this.clinicId, source: "meta_instagram" }),
      this.collection().countDocuments({ clinicId: this.clinicId, source: "manual" }),
    ]);
    return { meta_facebook: fb, meta_instagram: ig, manual };
  }
}
