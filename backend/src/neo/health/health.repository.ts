import type { Collection, Db, Filter, ObjectId } from "mongodb";
import { NEO_COLLECTIONS } from "@/neo/core/collections";
import { type NeoContext, scopeFilter } from "@/neo/core/neo-context";
import { now } from "@/clinic/core/datetime";

export type ServiceHealthStatus = "operational" | "degraded" | "critical" | "unknown";

export interface NeoStatusDoc {
  _id?: ObjectId;
  organizationId: string;
  clinicId: string;
  service: string;
  status: ServiceHealthStatus;
  currentLatencyMs?: number;
  normalLatencyMs?: [number, number];
  errorRate?: number;
  lastIncidentId?: string;
  aiDiagnosis?: string;
  updatedAt: Date;
}

export interface NeoHealthSnapshotDoc {
  _id?: ObjectId;
  organizationId: string;
  clinicId: string;
  day: string; // YYYY-MM-DD (Asia/Kolkata)
  score: number; // 0-100
  factors: Record<string, number>;
  incidents: number;
  criticalEvents: number;
  updatedAt: Date;
}

export class NeoHealthRepository {
  private readonly status: Collection<NeoStatusDoc>;
  private readonly snapshots: Collection<NeoHealthSnapshotDoc>;

  constructor(
    private readonly db: Db,
    private readonly scope: NeoContext
  ) {
    this.status = db.collection<NeoStatusDoc>(NEO_COLLECTIONS.status);
    this.snapshots = db.collection<NeoHealthSnapshotDoc>(NEO_COLLECTIONS.healthSnapshots);
  }

  private filter<T>(extra: Filter<T> = {} as Filter<T>): Filter<T> {
    return { ...scopeFilter(this.scope), ...extra } as Filter<T>;
  }

  async upsertStatus(doc: Partial<NeoStatusDoc> & { service: string }): Promise<void> {
    await this.status.updateOne(
      this.filter({ service: doc.service } as Filter<NeoStatusDoc>),
      {
        $set: {
          ...doc,
          organizationId: this.scope.organizationId,
          clinicId: this.scope.clinicId as string,
          updatedAt: now(),
        },
      } as never,
      { upsert: true }
    );
  }

  async getStatuses(): Promise<NeoStatusDoc[]> {
    return this.status.find(this.filter()).sort({ service: 1 }).toArray();
  }

  async getStatus(service: string): Promise<NeoStatusDoc | null> {
    return this.status.findOne(this.filter({ service } as Filter<NeoStatusDoc>));
  }

  async upsertSnapshot(doc: NeoHealthSnapshotDoc): Promise<void> {
    await this.snapshots.updateOne(
      this.filter({ day: doc.day } as Filter<NeoHealthSnapshotDoc>),
      { $set: doc } as never,
      { upsert: true }
    );
  }

  async getSnapshots(days: number): Promise<NeoHealthSnapshotDoc[]> {
    const since = new Date(now().getTime() - days * 86_400_000);
    return this.snapshots
      .find(this.filter<NeoHealthSnapshotDoc>({ updatedAt: { $gte: since } }))
      .sort({ day: -1 })
      .limit(days)
      .toArray();
  }
}
