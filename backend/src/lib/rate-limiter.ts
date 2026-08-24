import { nowMs } from "@/clinic/core/datetime";

export interface RateLimiter {
  check(key: string): boolean;
  clear(key: string): void;
}

/**
 * Simple in-memory sliding-window rate limiter.
 * Single-process only (fine for one WhatsApp worker / one Node server).
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  const { windowMs, max } = options;

  setInterval(() => {
    const cutoff = nowMs() - windowMs;
    for (const [key, times] of hits) {
      const remaining = times.filter((t) => t > cutoff);
      if (remaining.length === 0) hits.delete(key);
      else hits.set(key, remaining);
    }
  }, Math.max(windowMs, 60_000)).unref?.();

  return {
    check(key: string): boolean {
      const now = nowMs();
      const cutoff = now - windowMs;
      const times = (hits.get(key) ?? []).filter((t) => t > cutoff);
      if (times.length >= max) {
        hits.set(key, times);
        return false;
      }
      times.push(now);
      hits.set(key, times);
      return true;
    },
    clear(key: string) {
      hits.delete(key);
    },
  };
}
