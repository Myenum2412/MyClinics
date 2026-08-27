/**
 * One-off backfill: index every clinic entity into OpenSearch.
 *
 *   npm run search:reindex   (or: tsx src/scripts/reindex-search.ts)
 *
 * No-op (exits 0) if OpenSearch is not configured. Safe to run repeatedly —
 * document ids are deterministic, so re-indexing is idempotent.
 */
import "./bootstrap-env";
import { getDb } from "@/lib/db-pools";
import { logger } from "@/lib/logger";
import { isSearchEnabled, ensureSearchIndex } from "@/services/search/client";
import { indexEntity } from "@/services/search/indexer";
import { ENTITY_REGISTRY, ENTITY_TYPES, type EntityType } from "@/services/search/registry";

async function main(): Promise<void> {
  if (!isSearchEnabled()) {
    logger.info("OPENSEARCH_URL not set — nothing to reindex.");
    return;
  }
  await ensureSearchIndex();
  const db = await getDb();

  for (const entity of ENTITY_TYPES) {
    const cfg = ENTITY_REGISTRY[entity as EntityType];
    let processed = 0;
    let cursor: unknown = null;
    do {
      // Pull 500 docs at a time to keep memory bounded.
      const batch = await db
        .collection(cfg.collection)
        .find({ status: { $ne: "deleted" } })
        .skip(processed)
        .limit(500)
        .toArray();
      if (batch.length === 0) break;
      await Promise.all(
        batch.map((doc) =>
          indexEntity(
            entity as EntityType,
            doc.clinicId,
            doc[cfg.idField],
            doc as Record<string, any>
          ).catch(() => {})
        )
      );
      processed += batch.length;
      cursor = batch.length === 500 ? processed : null;
    } while (cursor !== null);

    logger.info(`Reindexed ${processed} ${entity} documents`);
  }

  logger.info("Search reindex complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Search reindex failed", { error: (error as Error).message });
    process.exit(1);
  });
