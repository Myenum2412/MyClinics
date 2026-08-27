import Redis from "ioredis";
import { nowMs } from "@/clinic/core/datetime";
import { logger } from "@/lib/logger";

/**
 * TTL cache used for hot read endpoints (organization details, soul,
 * knowledge list, doctor list, tenant-user revalidation). Values are
 * invalidated explicitly on writes via `invalidateCache(prefix)`.
 *
 * Backing store:
 *  - If `VALKEY_URL` (or `REDIS_URL`) is configured and reachable, entries are
 *    stored in Valkey — shared across API instances, off the Node heap, and
 *    able to hold far more than the in-process cap. This is the fast path in
 *    production.
 *  - Otherwise (and on any transient Valkey error) we silently fall back to the
 *    original in-process `Map` cache, so the API never hard-depends on Valkey.
 */

const VALKEY_URL = process.env.VALKEY_URL ?? process.env.REDIS_URL;
const KEY_PREFIX = process.env.VALKEY_KEY_PREFIX ?? "mc:cache:";

// --- In-process fallback store ------------------------------------------------
interface Entry {
  value: unknown;
  expiresAt: number;
}

const memory = new Map<string, Entry>();
const MAX_MEMORY_ENTRIES = 1000;

function sweepMemory(): void {
  const now = nowMs();
  for (const [key, entry] of memory) {
    if (entry.expiresAt <= now) memory.delete(key);
  }
  if (memory.size > MAX_MEMORY_ENTRIES) {
    const overflow = memory.size - MAX_MEMORY_ENTRIES;
    let removed = 0;
    for (const key of memory.keys()) {
      memory.delete(key);
      if (++removed >= overflow) break;
    }
  }
}

function memoryCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = nowMs();
  const hit = memory.get(key);
  if (hit && hit.expiresAt > now) return Promise.resolve(hit.value as T);
  return loader().then((value) => {
    memory.set(key, { value, expiresAt: now + ttlMs });
    sweepMemory();
    return value;
  });
}

function memoryInvalidate(prefix: string): void {
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

// --- Valkey client (lazy, resilient) -----------------------------------------
let redis: Redis | null = null;
let valkeyAvailable = Boolean(VALKEY_URL);

function getRedis(): Redis | null {
  if (!valkeyAvailable || !VALKEY_URL) return null;
  if (!redis) {
    try {
      redis = new Redis(VALKEY_URL, {
        // Never queue commands while disconnected — fail fast so the cache
        // call falls back to memory instead of hanging.
        enableOfflineQueue: false,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        // Do not auto-reconnect; we prefer the in-memory fallback on outage.
        retryStrategy: () => null,
      });
      redis.on("error", (err) => {
        // Swallow connection errors; the cache layer degrades to memory.
        logger.warn("Valkey connection error (falling back to memory cache)", {
          error: err.message,
        });
      });
    } catch {
      valkeyAvailable = false;
      return null;
    }
  }
  return redis;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const client = getRedis();
  if (client) {
    try {
      const raw = await client.get(KEY_PREFIX + key);
      if (raw !== null) return JSON.parse(raw).v as T;
      const value = await loader();
      await client.set(
        KEY_PREFIX + key,
        JSON.stringify({ v: value }),
        "PX",
        ttlMs
      );
      return value;
    } catch {
      // Valkey unavailable for this call — degrade to the memory cache.
      return memoryCached(key, ttlMs, loader);
    }
  }
  return memoryCached(key, ttlMs, loader);
}

/** Drop all entries whose key starts with the given prefix. */
export async function invalidateCache(prefix: string): Promise<void> {
  const client = getRedis();
  if (client) {
    try {
      const pattern = KEY_PREFIX + prefix + "*";
      let cursor = "0";
      const keys: string[] = [];
      do {
        const [next, found] = await client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        cursor = next;
        keys.push(...found);
      } while (cursor !== "0");
      if (keys.length) await client.unlink(...keys);
      return;
    } catch {
      // fall through to memory
    }
  }
  memoryInvalidate(prefix);
}

export function cacheSize(): number {
  return memory.size;
}

/** Best-effort graceful shutdown of the Valkey connection. */
export async function closeCache(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    redis = null;
  }
}
