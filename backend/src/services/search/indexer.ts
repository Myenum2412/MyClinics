import { getDb } from "@/lib/db-pools";
import { logger } from "@/lib/logger";
import { getSearchClient, isSearchEnabled, indexName } from "./client";
import { docId, ENTITY_REGISTRY, type EntityType } from "./registry";

/**
 * Index (or re-index) a single clinic entity into OpenSearch.
 *
 * Best-effort: errors are logged and swallowed so a search hiccup never
 * breaks the primary write path. No-op when OpenSearch is disabled.
 */
export async function indexEntity(
  entity: EntityType,
  clinicId: string,
  entityId: string,
  rawDoc: Record<string, any>
): Promise<void> {
  if (!isSearchEnabled() || !rawDoc) return;
  const client = getSearchClient();
  if (!client) return;
  try {
    const db = await getDb();
    const config = ENTITY_REGISTRY[entity];
    const doc = await config.build(rawDoc, db);
    if (!doc) return;
    await client.index({
      index: indexName(),
      id: docId(entity, clinicId, entityId),
      body: doc,
      refresh: false,
    });
  } catch (error) {
    logger.warn(`search index failed for ${entity} ${entityId}`, {
      error: (error as Error).message,
    });
  }
}

/** Remove an entity from the search index. Best-effort. */
export async function removeEntity(
  entity: EntityType,
  clinicId: string,
  entityId: string
): Promise<void> {
  if (!isSearchEnabled()) return;
  const client = getSearchClient();
  if (!client) return;
  try {
    await client.delete({
      index: indexName(),
      id: docId(entity, clinicId, entityId),
      refresh: false,
    });
  } catch {
    // A missing document is fine (already deleted / never indexed).
  }
}
