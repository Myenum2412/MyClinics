import { Client } from "@opensearch-project/opensearch";
import { logger } from "@/lib/logger";
import { INDEX_NAME } from "./registry";

/**
 * OpenSearch client singleton.
 *
 * The whole search feature is optional: `isSearchEnabled()` is false unless
 * `OPENSEARCH_URL` is configured, and any runtime failure marks search
 * disabled so the API degrades to the Mongo fallback instead of erroring.
 */
const OPENSEARCH_URL = process.env.OPENSEARCH_URL;
const OPENSEARCH_USERNAME = process.env.OPENSEARCH_USERNAME;
const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD;
const OPENSEARCH_INDEX_PREFIX = process.env.OPENSEARCH_INDEX_PREFIX ?? "";

let client: Client | null = null;
let disabled = false;

export function isSearchEnabled(): boolean {
  return Boolean(OPENSEARCH_URL) && !disabled;
}

export function getSearchClient(): Client | null {
  if (!OPENSEARCH_URL || disabled) return null;
  if (!client) {
    client = new Client({
      node: OPENSEARCH_URL,
      auth: OPENSEARCH_USERNAME
        ? { username: OPENSEARCH_USERNAME, password: OPENSEARCH_PASSWORD ?? "" }
        : undefined,
      requestTimeout: 5000,
    });
  }
  return client;
}

export function indexName(): string {
  return OPENSEARCH_INDEX_PREFIX + INDEX_NAME;
}

/** Create the search index on boot if it does not already exist. */
export async function ensureSearchIndex(): Promise<void> {
  const c = getSearchClient();
  if (!c) return;
  const name = indexName();
  try {
    const exists = await c.indices.exists({ index: name });
    if (exists.body === true) return;
    await c.indices.create({
      index: name,
      body: {
        mappings: {
          properties: {
            clinicId: { type: "keyword" },
            entity: { type: "keyword" },
            entityId: { type: "keyword" },
            title: { type: "text" },
            subtitle: { type: "text" },
            body: { type: "text" },
            status: { type: "keyword" },
            updatedAt: { type: "date" },
            // Stored for inline display but not analyzed/indexed.
            raw: { type: "object", enabled: false },
          },
        },
      },
    });
    logger.info(`Created OpenSearch index ${name}`);
  } catch (error) {
    disabled = true;
    logger.error("OpenSearch index setup failed; unified search disabled", {
      error: (error as Error).message,
    });
  }
}
