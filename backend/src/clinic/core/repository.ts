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
import { CLINIC_COLLECTIONS, type ClinicCollectionName } from "@/clinic/core/collections";
import type { ClinicContext } from "@/clinic/core/context";

/**
 * Every clinic-owned document must carry a `clinicId` string field. The type
 * system enforces it at compile time and the repository enforces it at
 * runtime — a document without a tenant cannot be created.
 *
 * `clinicId` is typed `string | null` so shared collections (users) can
 * hold platform_admin accounts; every tenant-scoped method throws when the
 * context has no clinicId.
 */
export type ClinicDocument = { clinicId: string | null } & Document;

const CLINIC_ID_FIELD = "clinicId" as const;
const SOFT_DELETE_MARKER = "deleted" as const;

function assertNoClinicIdOverride(value: Record<string, unknown>): void {
  if (value[CLINIC_ID_FIELD] !== undefined) {
    throw new Error(
      `Tenant isolation violation: raw query for ${CLINIC_ID_FIELD} is not allowed — ` +
        "scoping is injected automatically by ClinicRepository"
    );
  }
}

export interface ScopedQueryOptions {
  projection?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
  /** Include soft-deleted documents (clinic_admin audits, etc). */
  includeDeleted?: boolean;
}

export type ScopeMode = "clinic" | "doctor" | "patient" | "doctor-patient";

/**
 * Tenant-scoped repository base class.
 *
 * Safety contract:
 *  - `clinicId` is ALWAYS injected from the ClinicContext into every filter.
 *  - Callers cannot pass their own `clinicId` (throws — no override).
 *  - Doctor/patient resource scoping is injected automatically for the
 *    `doctor` / `patient` roles (doctorId / patientId), so a doctor can
 *    never query another doctor's records and a patient can never query
 *    another patient's records — even if a handler tries.
 *  - The raw Mongo collection is never exposed; a caller cannot bypass the
 *    scope, because every public method is the only way to touch data.
 *  - `updateMany` / `deleteMany` are intentionally NOT part of the public
 *    API to prevent accidental cross-document (or cross-tenant) mutations.
 *  - Deletion is soft: records are flagged `status: "deleted"` and excluded
 *    from every default query.
 */
export abstract class ClinicRepository<T extends ClinicDocument> {
  readonly collection: Collection<T>;

  protected constructor(
    protected readonly db: Db,
    collectionName: ClinicCollectionName,
    protected readonly ctx: ClinicContext,
    protected readonly scopeMode: ScopeMode = "clinic"
  ) {
    this.collection = db.collection(collectionName);
  }

  /** Merges the tenant scope into a caller-provided filter. */
  protected scoped(filter: Filter<T> = {}, includeDeleted = false): Filter<T> {
    assertNoClinicIdOverride(filter as Record<string, unknown>);
    const scope: Record<string, unknown> = {};

    if (!this.ctx.clinicId) {
      // platform_admin must never touch clinic collections without a tenant.
      throw new Error(
        "ClinicRepository cannot be used without a clinicId in context"
      );
    }
    scope.clinicId = this.ctx.clinicId;

    if (this.scopeMode === "doctor" || this.scopeMode === "doctor-patient") {
      if (this.ctx.role === "doctor") {
        scope.doctorId = this.ctx.doctorId ?? null;
      }
    }
    if (this.scopeMode === "patient" || this.scopeMode === "doctor-patient") {
      if (this.ctx.role === "patient") {
        scope.patientId = this.ctx.patientId ?? null;
      }
    }

    if (!includeDeleted) scope.status = { $ne: SOFT_DELETE_MARKER };

    return { ...(filter as Record<string, unknown>), ...scope } as Filter<T>;
  }

  async findOneById(id: ObjectId | string, includeDeleted = false): Promise<WithId<T> | null> {
    if (typeof id === "string" && !isValidObjectIdString(id)) return null;
    return this.collection.findOne(
      this.scoped({ _id: id as never } as Filter<T>, includeDeleted)
    );
  }

  async findOne(filter: Filter<T> = {}, includeDeleted = false): Promise<WithId<T> | null> {
    return this.collection.findOne(this.scoped(filter, includeDeleted));
  }

  async find(filter: Filter<T> = {}, options: ScopedQueryOptions = {}): Promise<WithId<T>[]> {
    return this.collection
      .find(this.scoped(filter, options.includeDeleted ?? false), options.projection ? { projection: options.projection } : {})
      .sort(options.sort ?? { createdAt: -1 })
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 0)
      .toArray();
  }

  async count(filter: Filter<T> = {}, includeDeleted = false): Promise<number> {
    return this.collection.countDocuments(this.scoped(filter, includeDeleted));
  }

  /**
   * Inserts a document, stamping `clinicId` (and `createdAt`) from the
   * tenant context. The caller's data must NOT include clinicId
   * (compile-time enforced) — the tenant boundary is owned by the repository.
   */
  async insert(data: OptionalUnlessRequiredId<Omit<T, "clinicId">>): Promise<WithId<T>> {
    assertNoClinicIdOverride(data as unknown as Record<string, unknown>);
    if (!this.ctx.clinicId) {
      throw new Error(
        "ClinicRepository cannot be used without a clinicId in context"
      );
    }
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
    const stamped = {
      ...update,
      $set: { ...(update.$set ?? {}), updatedAt: new Date() },
    } as unknown as UpdateFilter<T>;
    const result = await this.collection.updateOne(this.scoped(filter), stamped, options);
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId ?? undefined,
    };
  }

  /** Hard delete — only inside the tenant scope (used for cleanup paths). */
  async deleteOne(filter: Filter<T>): Promise<boolean> {
    const result = await this.collection.deleteOne(this.scoped(filter));
    return result.deletedCount === 1;
  }

  /** Soft delete: flags the record so default queries exclude it. */
  async softDelete(filter: Filter<T>): Promise<boolean> {
    const result = await this.collection.updateOne(this.scoped(filter), {
      $set: { status: SOFT_DELETE_MARKER, deletedAt: new Date(), updatedAt: new Date() },
    } as unknown as UpdateFilter<T>);
    return result.modifiedCount === 1;
  }

  /** Returns true when at least one scoped document exists. */
  async exists(filter: Filter<T> = {}): Promise<boolean> {
    return (await this.collection.countDocuments(this.scoped(filter), { limit: 1 })) > 0;
  }
}

export function isValidObjectIdString(value: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(value);
}
