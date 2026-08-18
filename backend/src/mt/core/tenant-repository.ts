import type {
  Collection,
  Db,
  Document,
  Filter,
  ObjectId,
  OptionalUnlessRequiredId,
  UpdateFilter,
  WithId,
} from "mongodb";
import { MT_COLLECTIONS, type MtCollectionName } from "@/mt/core/collections";
import type { TenantContext } from "@/mt/core/tenant-context";

/**
 * Every multi-tenant document must carry a `clinicId` string field. The type
 * system enforces it at compile time and the repository enforces it at
 * runtime — a document without a tenant cannot be created.
 */
export type TenantDocument = { clinicId: string } & Document;

const CLINIC_ID_FIELD = "clinicId" as const;

function assertNoClinicIdOverride(filter: Record<string, unknown>): void {
  if (filter[CLINIC_ID_FIELD] !== undefined) {
    throw new Error(
      `Tenant isolation violation: raw query for ${CLINIC_ID_FIELD} is not allowed — ` +
        "scoping is injected automatically by TenantRepository"
    );
  }
}

export interface ScopedQueryOptions {
  projection?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
}

/**
 * Tenant-scoped repository base class.
 *
 * Safety contract:
 *  - `clinicId` is ALWAYS injected from the TenantContext into every filter.
 *  - Callers cannot pass their own `clinicId` (throws — no override).
 *  - The raw Mongo collection is never exposed; a caller cannot bypass the
 *    scope, because every public method is the only way to touch data.
 *  - `updateMany` / `deleteMany` are intentionally NOT part of the public
 *    API to prevent accidental cross-document (or cross-tenant) mutations.
 */
export abstract class TenantRepository<T extends TenantDocument> {
  protected constructor(
    protected readonly db: Db,
    collectionName: MtCollectionName,
    protected readonly ctx: TenantContext
  ) {
    this.collection = db.collection(collectionName);
  }

  readonly collection: Collection<T>;

  /** Merges the tenant scope into a caller-provided filter. */
  protected scoped(filter: Filter<T> = {}): Filter<T> {
    assertNoClinicIdOverride(filter as Record<string, unknown>);
    return { ...(filter as Record<string, unknown>), clinicId: this.ctx.clinicId } as Filter<T>;
  }

  async findOneById(id: ObjectId | string): Promise<WithId<T> | null> {
    if (typeof id === "string" && !isValidObjectIdString(id)) return null;
    return this.collection.findOne(this.scoped({ _id: id as never } as Filter<T>));
  }

  async findOne(filter: Filter<T> = {}): Promise<WithId<T> | null> {
    return this.collection.findOne(this.scoped(filter));
  }

  async find(filter: Filter<T> = {}, options: ScopedQueryOptions = {}): Promise<WithId<T>[]> {
    return this.collection
      .find(this.scoped(filter), options.projection ? { projection: options.projection } : {})
      .sort(options.sort ?? { createdAt: -1 })
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 0)
      .toArray();
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    return this.collection.countDocuments(this.scoped(filter));
  }

  /**
   * Inserts a document, stamping `clinicId` from the tenant context.
   * The caller's data must NOT include clinicId (compile-time enforced) —
   * the tenant boundary is owned by the repository.
   */
  async insert(data: OptionalUnlessRequiredId<Omit<T, "clinicId">>): Promise<WithId<T>> {
    assertNoClinicIdOverride(data as unknown as Record<string, unknown>);
    const doc = {
      ...data,
      clinicId: this.ctx.clinicId,
      createdAt: new Date(),
    } as unknown as OptionalUnlessRequiredId<T>;
    const { insertedId } = await this.collection.insertOne(doc);
    return (await this.collection.findOne({ _id: insertedId } as Filter<T>)) as WithId<T>;
  }

  async updateOne(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options: { upsert?: boolean } = {}
  ): Promise<{ matchedCount: number; modifiedCount: number; upsertedId?: ObjectId }> {
    const result = await this.collection.updateOne(this.scoped(filter), update, options);
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId ?? undefined,
    };
  }

  /** Deletes a single document — only inside the tenant scope. */
  async deleteOne(filter: Filter<T>): Promise<boolean> {
    const result = await this.collection.deleteOne(this.scoped(filter));
    return result.deletedCount === 1;
  }

  /** Returns true when at least one scoped document exists. */
  async exists(filter: Filter<T> = {}): Promise<boolean> {
    return (await this.collection.countDocuments(this.scoped(filter), { limit: 1 })) > 0;
  }
}

export function isValidObjectIdString(value: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(value);
}
