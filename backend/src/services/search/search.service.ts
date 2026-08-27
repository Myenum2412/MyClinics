import { getDb } from "@/lib/db-pools";
import { logger } from "@/lib/logger";
import { getSearchClient, isSearchEnabled, indexName } from "./client";
import { ENTITY_REGISTRY, ENTITY_TYPES, type EntityType } from "./registry";

export interface SearchHit {
  entityId: string;
  title: string;
  subtitle: string;
  status: string;
  raw: Record<string, unknown>;
}

export interface SearchResultGroup {
  entity: EntityType;
  hits: SearchHit[];
}

export interface SearchResponse {
  /** Whether results came from OpenSearch (true) or the Mongo fallback (false). */
  enabled: boolean;
  groups: SearchResultGroup[];
  total: number;
}

const DEFAULT_LIMIT_PER_TYPE = 5;

/**
 * Unified, cross-entity search for a single clinic.
 *
 *  1. If OpenSearch is configured, run a `multi_match` across title/subtitle/
 *     body, filtered to the clinic, and group the top hits per entity.
 *  2. On any OpenSearch failure (or when it is disabled), fall back to a
 *     Mongo `$or` regex scan over each entity's registered fields so the
 *     endpoint always works.
 */
export async function search(
  clinicId: string,
  q: string,
  opts: { types?: EntityType[]; limitPerType?: number } = {}
): Promise<SearchResponse> {
  const term = (q ?? "").trim();
  const limitPerType = opts.limitPerType ?? DEFAULT_LIMIT_PER_TYPE;
  if (!term) return { enabled: isSearchEnabled(), groups: [], total: 0 };

  if (isSearchEnabled()) {
    const client = getSearchClient();
    if (client) {
      try {
        const must: Record<string, unknown>[] = [
          { term: { clinicId } },
          {
            multi_match: {
              query: term,
              fields: ["title^3", "subtitle^2", "body"],
              operator: "or",
              fuzziness: "AUTO",
            },
          },
        ];
        if (opts.types && opts.types.length) {
          must.push({ terms: { entity: opts.types } });
        }
        const res = await client.search({
          index: indexName(),
          size: 50,
          body: {
            query: { bool: { must } },
            sort: [{ _score: "desc" }, { updatedAt: "desc" }],
          },
        });
        const hitsRaw = (res.body?.hits?.hits ?? []) as Array<{
          _source: SearchHit & { entity: EntityType };
        }>;
        const groupsMap = new Map<EntityType, SearchHit[]>();
        let total = 0;
        for (const h of hitsRaw) {
          const src = h._source;
          if (!src) continue;
          const entity = src.entity;
          const arr = groupsMap.get(entity) ?? [];
          if (arr.length < limitPerType) {
            arr.push({
              entityId: src.entityId,
              title: src.title,
              subtitle: src.subtitle,
              status: src.status,
              raw: src.raw,
            });
          }
          groupsMap.set(entity, arr);
          total++;
        }
        const groups: SearchResultGroup[] = [...groupsMap.entries()].map(
          ([entity, hits]) => ({ entity, hits })
        );
        return { enabled: true, groups, total };
      } catch (error) {
        logger.warn("OpenSearch query failed; falling back to Mongo search", {
          error: (error as Error).message,
        });
      }
    }
  }

  return mongoFallback(clinicId, term, opts.types, limitPerType);
}

/** Mongo regex fallback used when OpenSearch is unavailable. */
async function mongoFallback(
  clinicId: string,
  term: string,
  types: EntityType[] | undefined,
  limitPerType: number
): Promise<SearchResponse> {
  const db = await getDb();
  const entities = types && types.length ? types : ENTITY_TYPES;
  const regex = { $regex: term, $options: "i" };
  const groups: SearchResultGroup[] = [];
  let total = 0;

  for (const entity of entities) {
    const cfg = ENTITY_REGISTRY[entity];
    const filter: Record<string, unknown> = {
      clinicId,
      status: { $ne: "deleted" },
      $or: cfg.searchFields.map((f) => ({ [f]: regex })),
    };

    // The OpenSearch path enriches appointments/prescriptions with the linked
    // patient (and doctor) name. To keep the Mongo fallback useful, widen the
    // filter to also match those entities by their patient's name/contact.
    if (entity === "appointment" || entity === "prescription") {
      const patientIds = await db
        .collection("clc_patients")
        .find(
          {
            clinicId,
            status: { $ne: "deleted" },
            $or: [{ fullName: regex }, { mobile: regex }, { email: regex }],
          },
          { projection: { patientId: 1 } }
        )
        .toArray();
      const ids = patientIds.map((p) => p.patientId).filter(Boolean);
      if (ids.length) (filter.$or as Record<string, unknown>[]).push({ patientId: { $in: ids } });
    }

    const docs = await db
      .collection(cfg.collection)
      .find(filter)
      .limit(limitPerType)
      .toArray();

    const hits: SearchHit[] = [];
    for (const doc of docs) {
      const sd = await cfg.build(doc as Record<string, any>, db);
      hits.push({
        entityId: (doc as Record<string, any>)[cfg.idField],
        title: sd?.title ?? "",
        subtitle: sd?.subtitle ?? "",
        status: sd?.status ?? (doc as Record<string, any>).status ?? "",
        raw: sd?.raw ?? {},
      });
    }
    if (hits.length) {
      groups.push({ entity, hits });
      total += hits.length;
    }
  }

  return { enabled: false, groups, total };
}
