import type { Collection, Db, Filter, ObjectId } from "mongodb";
import { NEO_COLLECTIONS } from "@/neo/core/collections";
import { scopeFilter, type NeoContext } from "@/neo/core/neo-context";
import type { NeoEventDoc } from "@/neo/events/event.schema";
import type { ListEventsQuery } from "@/neo/events/event.dto";

/**
 * Data access for RGB Neo events. Every read/write is constrained by the
 * NeoContext scope: a clinic-scoped context can only touch its own clinic's
 * events, an organization-scoped (platform_admin) context touches the whole
 * organization. The organizationId is always applied.
 */
export class NeoEventRepository {
  private readonly collection: Collection<NeoEventDoc>;

  constructor(
    private readonly db: Db,
    private readonly scope: NeoContext
  ) {
    this.collection = db.collection<NeoEventDoc>(NEO_COLLECTIONS.events);
  }

  private filter(extra: Filter<NeoEventDoc> = {}): Filter<NeoEventDoc> {
    return { ...scopeFilter(this.scope), ...extra } as Filter<NeoEventDoc>;
  }

  async existsByIdempotencyKey(key: string): Promise<NeoEventDoc | null> {
    return this.collection.findOne(
      this.filter({ idempotencyKey: key } as Filter<NeoEventDoc>),
      { projection: { _id: 0, eventId: 1, processingStatus: 1 } } as never
    );
  }

  async insert(doc: NeoEventDoc): Promise<NeoEventDoc> {
    const { insertedId } = await this.collection.insertOne(doc as never);
    return (await this.collection.findOne({ _id: insertedId as ObjectId } as Filter<NeoEventDoc>)) as NeoEventDoc;
  }

  async updateByEventId(
    eventId: string,
    update: Partial<NeoEventDoc>
  ): Promise<void> {
    await this.collection.updateOne(
      this.filter({ eventId } as Filter<NeoEventDoc>),
      { $set: update } as never
    );
  }

  async findById(eventId: string): Promise<NeoEventDoc | null> {
    return this.collection.findOne(this.filter({ eventId } as Filter<NeoEventDoc>));
  }

  async list(query: ListEventsQuery): Promise<{ items: NeoEventDoc[]; total: number }> {
    const f: Filter<NeoEventDoc> = this.filter();
    if (query.severity) f.severity = query.severity;
    if (query.eventType) f.eventType = query.eventType;
    if (query.category) f.category = query.category;
    if (query.service) f.service = query.service;
    if (query.processingStatus) f.processingStatus = query.processingStatus as NeoEventDoc["processingStatus"];
    if (query.incidentId) f.incidentId = query.incidentId;
    if (query.from || query.to) {
      f.timestamp = {};
      if (query.from) f.timestamp.$gte = new Date(query.from);
      if (query.to) f.timestamp.$lte = new Date(query.to);
    }
    if (query.q) {
      f.$or = [
        { message: { $regex: query.q, $options: "i" } },
        { service: { $regex: query.q, $options: "i" } },
        { source: { $regex: query.q, $options: "i" } },
      ];
    }
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.collection
        .find(f)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(query.limit)
        .toArray(),
      this.collection.countDocuments(f),
    ]);
    return { items, total };
  }

  /** Recent events for a clinic/service window — used by correlation. */
  async recentForCorrelation(
    clinicId: string,
    service: string,
    since: Date,
    limit = 50
  ): Promise<NeoEventDoc[]> {
    return this.collection
      .find(
        this.filter({
          clinicId,
          service,
          timestamp: { $gte: since },
        } as Filter<NeoEventDoc>)
      )
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  async countBySeverity(
    clinicId: string,
    since: Date
  ): Promise<Record<string, number>> {
    const pipeline = [
      {
        $match: this.filter({
          clinicId,
          timestamp: { $gte: since },
        } as Filter<NeoEventDoc>),
      },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ];
    const rows = await this.collection.aggregate(pipeline).toArray();
    const out: Record<string, number> = {};
    for (const r of rows) out[String(r._id)] = r.count as number;
    return out;
  }

  async recent(limit: number, clinicId?: string): Promise<NeoEventDoc[]> {
    const f = clinicId
      ? this.filter({ clinicId } as Filter<NeoEventDoc>)
      : this.filter();
    return this.collection.find(f).sort({ timestamp: -1 }).limit(limit).toArray();
  }

  /** Daily worst-severity timeline for a single service (for the status monitor). */
  async dailySeverityTimeline(
    clinicId: string,
    service: string,
    since: Date
  ): Promise<Map<string, { worst: number; count: number }>> {
    const pipeline = [
      {
        $match: this.filter({
          clinicId,
          service,
          timestamp: { $gte: since },
        } as Filter<NeoEventDoc>),
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp",
              timezone: "Asia/Kolkata",
            },
          },
          worst: {
            $max: {
              $switch: {
                branches: [
                  { case: { $eq: ["$severity", "critical"] }, then: 3 },
                  { case: { $eq: ["$severity", "high"] }, then: 2 },
                  { case: { $eq: ["$severity", "medium"] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
          count: { $sum: 1 },
        },
      },
    ];
    const rows = await this.collection.aggregate(pipeline).toArray();
    const map = new Map<string, { worst: number; count: number }>();
    for (const r of rows) {
      map.set(String(r._id), { worst: r.worst as number, count: r.count as number });
    }
    return map;
  }
}
