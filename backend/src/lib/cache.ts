interface Entry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();
const MAX_ENTRIES = 1000;

function sweep(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  if (store.size > MAX_ENTRIES) {
    const overflow = store.size - MAX_ENTRIES;
    let removed = 0;
    for (const key of store.keys()) {
      store.delete(key);
      if (++removed >= overflow) break;
    }
  }
}

/**
 * Tiny in-process TTL cache for hot read endpoints (organization details,
 * soul, knowledge list, doctor list). Values are invalidated explicitly on
 * writes via `invalidateCache(prefix)`.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;
  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  sweep();
  return value;
}

/** Drop all entries whose key starts with the given prefix. */
export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function cacheSize(): number {
  return store.size;
}