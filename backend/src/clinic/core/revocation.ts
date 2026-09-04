import { getDb } from "@/lib/db-pools";
import { nowMs } from "@/clinic/core/datetime";
import { logger } from "@/lib/logger";

const COLLECTION = "clc_revoked_jtis";

// In-memory fallback when Mongo is unavailable (tests)
const memRevoked = new Map<string, number>();

export async function isRevoked(jti: string): Promise<boolean> {
  if (!jti) return false;
  // Check memory first
  const exp = memRevoked.get(jti);
  if (exp !== undefined) {
    if (exp > nowMs()) return true;
    memRevoked.delete(jti);
  }
  try {
    const db = await getDb();
    const doc = await db.collection(COLLECTION).findOne({ jti });
    if (!doc) return false;
    if ((doc.expiresAt as number) <= nowMs()) {
      // Lazy cleanup
      await db.collection(COLLECTION).deleteOne({ jti }).catch(() => {});
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function revokeJti(jti: string, expiresAtMs: number): Promise<void> {
  if (!jti) return;
  const ttl = Math.max(0, expiresAtMs - nowMs());
  if (ttl <= 0) return;
  memRevoked.set(jti, expiresAtMs);
  try {
    const db = await getDb();
    // Ensure TTL index exists (best-effort)
    await db.collection(COLLECTION).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    await db.collection(COLLECTION).updateOne(
      { jti },
      { $set: { jti, expiresAt: new Date(expiresAtMs), createdAt: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    logger.warn("revokeJti mongo failed, kept in memory", { error: String(e) });
  }
  // Also try Valkey for fast check if available
  try {
    const { cached, invalidateCache } = await import("@/lib/cache");
    void cached; void invalidateCache;
    // Use Valkey directly if configured
    const valkeyUrl = process.env.VALKEY_URL ?? process.env.REDIS_URL;
    if (valkeyUrl) {
      const { default: Redis } = await import("ioredis");
      const r = new Redis(valkeyUrl, { enableOfflineQueue: false, maxRetriesPerRequest: 1, retryStrategy: () => null });
      await r.set(`revoked:${jti}`, "1", "PX", ttl).catch(() => {});
      await r.quit().catch(() => {});
    }
  } catch {}
}

export async function isRevokedWithCache(jti: string): Promise<boolean> {
  // Fast path: check Valkey if available
  try {
    const valkeyUrl = process.env.VALKEY_URL ?? process.env.REDIS_URL;
    if (valkeyUrl) {
      const { default: Redis } = await import("ioredis");
      const r = new Redis(valkeyUrl, { enableOfflineQueue: false, maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 500 });
      const v = await r.get(`revoked:${jti}`).catch(() => null);
      await r.quit().catch(() => {});
      if (v === "1") return true;
    }
  } catch {}
  return isRevoked(jti);
}
