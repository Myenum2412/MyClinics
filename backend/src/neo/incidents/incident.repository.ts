import type { Collection, Db, Filter, ObjectId } from "mongodb";
import { NEO_COLLECTIONS } from "@/neo/core/collections";
import { type NeoContext, scopeFilter } from "@/neo/core/neo-context";
import type { NeoIncidentDoc, IncidentStatus } from "@/neo/incidents/incident.schema";
import type { ListEventsQuery } from "@/neo/events/event.dto";
import { now } from "@/clinic/core/datetime";

const OPEN_STATUSES: IncidentStatus[] = [
  "DETECTED",
  "TRIAGED",
  "INVESTIGATING",
  "ROOT_CAUSE_IDENTIFIED",
  "ACTION_RECOMMENDED",
  "REMEDIATION",
  "MONITORING",
  "RECOVERED",
];

export class NeoIncidentRepository {
  private readonly collection: Collection<NeoIncidentDoc>;

  constructor(
    private readonly db: Db,
    private readonly scope: NeoContext
  ) {
    this.collection = db.collection<NeoIncidentDoc>(NEO_COLLECTIONS.incidents);
  }

  private filter(extra: Filter<NeoIncidentDoc> = {}): Filter<NeoIncidentDoc> {
    return { ...scopeFilter(this.scope), ...extra } as Filter<NeoIncidentDoc>;
  }

  async findOpenByKey(
    correlationKey: string,
    since: Date
  ): Promise<NeoIncidentDoc | null> {
    return this.collection.findOne(
      this.filter({
        correlationKey,
        status: { $in: OPEN_STATUSES },
        lastEventAt: { $gte: since },
      } as Filter<NeoIncidentDoc>),
      { sort: { lastEventAt: -1 } }
    );
  }

  async insert(doc: NeoIncidentDoc): Promise<NeoIncidentDoc> {
    const { insertedId } = await this.collection.insertOne(doc as never);
    return (await this.collection.findOne({ _id: insertedId as ObjectId } as Filter<NeoIncidentDoc>)) as NeoIncidentDoc;
  }

  async updateByIncidentId(
    incidentId: string,
    update: Partial<NeoIncidentDoc>
  ): Promise<void> {
    await this.collection.updateOne(
      this.filter({ incidentId } as Filter<NeoIncidentDoc>),
      { $set: { ...update, updatedAt: now() } } as never
    );
  }

  async findById(incidentId: string): Promise<NeoIncidentDoc | null> {
    return this.collection.findOne(this.filter({ incidentId } as Filter<NeoIncidentDoc>));
  }

  async list(query: {
    status?: IncidentStatus;
    severity?: string;
    clinicId?: string;
    limit: number;
    page: number;
  }): Promise<{ items: NeoIncidentDoc[]; total: number }> {
    const f: Filter<NeoIncidentDoc> = this.filter();
    if (query.status) f.status = query.status;
    if (query.severity) f.severity = query.severity as NeoIncidentDoc["severity"];
    if (query.clinicId) f.clinicId = query.clinicId;
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.collection.find(f).sort({ lastEventAt: -1 }).skip(skip).limit(query.limit).toArray(),
      this.collection.countDocuments(f),
    ]);
    return { items, total };
  }

  async orgStats(): Promise<{
    total: number;
    open: number;
    critical: number;
    byStatus: Record<string, number>;
  }> {
    const f = this.filter();
    const [total, open, critical, byStatusRows] = await Promise.all([
      this.collection.countDocuments(f),
      this.collection.countDocuments({ ...f, status: { $in: OPEN_STATUSES } }),
      this.collection.countDocuments({ ...f, severity: "critical", status: { $in: OPEN_STATUSES } }),
      this.collection.aggregate([
        { $match: f },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).toArray(),
    ]);
    const byStatus: Record<string, number> = {};
    for (const r of byStatusRows) byStatus[String(r._id)] = r.count as number;
    return { total, open, critical, byStatus };
  }
}

export type { ListEventsQuery };
