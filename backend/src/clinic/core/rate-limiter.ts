import { RateLimitError } from "@/clinic/core/errors";
import { nowMs } from "@/clinic/core/datetime";

interface Bucket {
  hits: number[];
  resetAt: number;
}

/**
 * In-memory sliding-window rate limiter. Sufficient for a single-process
 * deployment; swap for a shared store (Redis) when scaling horizontally.
 * Never throws — returns whether the request is allowed.
 */
export class SlidingWindowLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly windowMs: number,
    private readonly maxHits: number
  ) {
    // Periodic cleanup every 5 minutes to prevent memory leak from expired buckets
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    // Don't prevent process exit
    this.cleanupInterval.unref?.();
  }

  /** Registers a hit; returns true when the hit is within the limit. */
  hit(key: string, now = nowMs()): boolean {
    const bucket = this.buckets.get(key);
    const cutoff = now - this.windowMs;
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { hits: [now], resetAt: now + this.windowMs });
      return true;
    }
    const alive = bucket.hits.filter((t) => t > cutoff);
    if (alive.length >= this.maxHits) {
      bucket.hits = alive;
      return false;
    }
    bucket.hits = alive;
    bucket.hits.push(now);
    return true;
  }

  /** Number of hits in the current window (for tests / metrics). */
  count(key: string, now = nowMs()): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return 0;
    return bucket.hits.filter((t) => t > now - this.windowMs).length;
  }

  clear(key?: string): void {
    if (key) this.buckets.delete(key);
    else this.buckets.clear();
  }

  /** Remove expired buckets and prune old hits from active buckets. */
  private cleanup(now = nowMs()): void {
    const cutoff = now - this.windowMs;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      } else {
        // Prune stale hits within the bucket
        const alive = bucket.hits.filter((t) => t > cutoff);
        if (alive.length === 0) {
          this.buckets.delete(key);
        } else {
          bucket.hits = alive;
        }
      }
    }
  }

  /** For testing: get current bucket count */
  getBucketCount(): number {
    return this.buckets.size;
  }
}

export const AUTH_LIMITER = new SlidingWindowLimiter(60_000, 10);
export const API_LIMITER = new SlidingWindowLimiter(60_000, 600);

// Attempt distributed limit via Valkey if configured; fallback to in-memory.
let redisForLimit: import("ioredis").default | null = null;
function getRedisForLimit(): import("ioredis").default | null {
  const url = process.env.VALKEY_URL ?? process.env.REDIS_URL;
  if (!url) return null;
  if (redisForLimit) return redisForLimit;
  try {
    const Redis = require("ioredis").default as typeof import("ioredis").default;
    redisForLimit = new Redis(url, {
      enableOfflineQueue: false,
      connectTimeout: 500,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    redisForLimit.on("error", () => {});
    return redisForLimit;
  } catch {
    return null;
  }
}

/** Guards an action behind a limiter, throwing RateLimitError when exceeded. */
export function enforceLimit(limiter: SlidingWindowLimiter, key: string): void {
  if (!limiter.hit(key)) {
    throw new RateLimitError();
  }
}

/** Distributed async variant – prefers Valkey INCR+PX, falls back to memory. */
export async function enforceLimitAsync(limiter: SlidingWindowLimiter, key: string): Promise<void> {
  const redis = getRedisForLimit();
  if (!redis) return enforceLimit(limiter, key);
  try {
    const windowMs = (limiter as unknown as { windowMs: number }).windowMs ?? 60_000;
    const maxHits = (limiter as unknown as { maxHits: number }).maxHits ?? 10;
    const rkey = `rl:${key}`;
    const count = await redis.incr(rkey);
    if (count === 1) await redis.pexpire(rkey, windowMs);
    if (count > maxHits) throw new RateLimitError();
    return;
  } catch (e) {
    if (e instanceof RateLimitError) throw e;
    // On redis error, fallback
    return enforceLimit(limiter, key);
  }
}
