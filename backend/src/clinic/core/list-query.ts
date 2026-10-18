import type { Collection, Db, Document } from "mongodb";
import { escapeRegex } from "@/clinic/core/pagination";

/**
 * Shared helper for the tenant list endpoints that join patient/doctor names.
 *
 * Two problems made these lists O(rows × foreign-collection size):
 *   1. `$lookup` with `localField`/`foreignField` only uses an index if one
 *      starts with the foreign field. Without it, MongoDB scans the whole
 *      foreign collection for EVERY row (a 2,500-row list over 500 patients
 *      examined ~1.25M documents and took ~500ms locally).
 *   2. The joins ran before `$skip`/`$limit`, so every row was joined even
 *      though only one page is displayed.
 *
 * This helper paginates first and only joins the visible page; the count is a
 * plain indexed `countDocuments`. Free-text search is expected to be resolved
 * to base-collection clauses (see `matchEntityIds`) so it can be applied in
 * the initial `$match` — i.e. before the joins — instead of joining every row.
 */
export interface JoinSpec {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
}

export interface PaginatedJoinListOptions {
  collection: Collection<any>;
  match: Record<string, unknown>;
  joins?: JoinSpec[];
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
  /** Post-join projection stages (e.g. $set of joined names, $unset aliases). */
  project?: Record<string, unknown>[];
}

export function joinStages(joins: JoinSpec[]): Record<string, unknown>[] {
  const stages: Record<string, unknown>[] = [];
  for (const j of joins) {
    stages.push({
      $lookup: {
        from: j.from,
        localField: j.localField,
        foreignField: j.foreignField,
        as: j.as,
      },
    });
    stages.push({ $unwind: { path: `$${j.as}`, preserveNullAndEmptyArrays: true } });
  }
  return stages;
}

export async function paginatedJoinList<T extends Document = Document>(
  opts: PaginatedJoinListOptions
): Promise<[T[], number]> {
  const { collection, match, joins = [], sort, skip, limit, project = [] } = opts;

  const [items, total] = await Promise.all([
    collection
      .aggregate<T>([
        { $match: match },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        ...joinStages(joins),
        ...project,
      ])
      .toArray(),
    collection.countDocuments(match),
  ]);
  return [items, total];
}

/**
 * Resolves a free-text search into the ids of a related collection that match,
 * capped so an over-broad query can't load an unbounded id list.
 */
export async function matchEntityIds(
  db: Db,
  collectionName: string,
  clinicId: string,
  idField: string,
  orClauses: Record<string, unknown>[],
  cap = 2000
): Promise<string[]> {
  const docs = await db
    .collection(collectionName)
    .find({ clinicId, $or: orClauses }, { projection: { [idField]: 1 } })
    .limit(cap)
    .toArray();
  return docs.map((d) => d[idField] as string).filter(Boolean);
}

/** Builds the `{ field: { $in: ids } }` clause, or nothing when the set is empty. */
export function idClause(field: string, ids: string[]): Record<string, unknown>[] {
  return ids.length ? [{ [field]: { $in: ids } }] : [];
}

export { escapeRegex };
