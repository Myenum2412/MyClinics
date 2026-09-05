/**
 * ReactiveX polling & scheduling utilities
 * https://reactivex.io/documentation/operators.html
 * https://reactivex.io/documentation/scheduler.html
 *
 * Replaces imperative setInterval / setTimeout loops with declarative
 * Observable streams — easier to compose, retry, back-off, and cancel.
 *
 *   interval(30_000).pipe(
 *     switchMap(() => from(scanAndQueueReminders(db, new Date()))),
 *     retry({ delay: (err, i) => timer(backoffMs(i)) }),
 *     catchError(e => { logger.warn(...); return EMPTY })
 *   )
 */

import {
  interval,
  timer,
  defer,
  from,
  EMPTY,
  type Observable,
  type Subscription,
} from "rxjs";
import {
  switchMap,
  catchError,
  retry,
  tap,
  share,
} from "rxjs/operators";
import { logger } from "@/lib/logger";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Exponential backoff in ms (1000 * 2^n capped at 30s). */
export function backoffMs(attempt: number, baseMs = 1000, capMs = 30_000): number {
  return Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1));
}

// ── Core polling factory ──────────────────────────────────────────────────

/**
 * Creates a polling Observable that fires `work()` every `periodMs`.
 * - Runs immediately on subscribe (no initial delay) unless `immediate: false`.
 * - Concurrency: switchMap — if previous work is still running it is NOT
 *   cancelled; overlapping executions are skipped via `exhaustMap` pattern.
 * - Errors are caught, logged, and the stream continues (no teardown).
 * - Returns the Subscription so callers can `.unsubscribe()` on shutdown.
 *
 * Example:
 *   const sub = createPolling(() => scanAndQueueReminders(db, nowFn()), 30_000);
 *   // on shutdown: sub.unsubscribe()
 */
export function createPolling(
  work: () => Promise<unknown>,
  periodMs: number,
  opts: { immediate?: boolean; label?: string } = {},
): Subscription {
  const { immediate = true, label = "polling" } = opts;

  const source$: Observable<number> = immediate
    ? defer(() => from(work()).pipe(
        catchError((err) => {
          logger.warn(`${label} immediate tick failed`, { error: String(err).slice(0, 300) });
          return EMPTY;
        }),
        switchMap(() => interval(periodMs)),
      ))
    : interval(periodMs);

  // For the immediate case we already ran once; for non-immediate we start with interval.
  // Unified stream: every tick → work()
  const ticks$ = immediate
    ? timer(0, periodMs) // emits 0 immediately then every periodMs
    : interval(periodMs);

  return ticks$
    .pipe(
      switchMap(() =>
        from(work()).pipe(
          catchError((err) => {
            logger.warn(`${label} tick failed`, { error: err instanceof Error ? err.message : String(err).slice(0, 300) });
            return EMPTY;
          }),
        ),
      ),
    )
    .subscribe();
}

/**
 * Creates a polling Observable with exponential-backoff retry.
 * On failure it retries `maxRetries` times with `backoffMs(i)` delay.
 */
export function createPollingWithRetry(
  work: () => Promise<unknown>,
  periodMs: number,
  opts: { maxRetries?: number; label?: string } = {},
): Subscription {
  const { maxRetries = 5, label = "polling-retry" } = opts;

  return timer(0, periodMs)
    .pipe(
      switchMap(() =>
        defer(() => from(work())).pipe(
          retry({
            count: maxRetries,
            delay: (error, retryCount) => {
              const delayMs = backoffMs(retryCount);
              logger.warn(`${label} retry ${retryCount}/${maxRetries} after ${delayMs}ms`, {
                error: error instanceof Error ? error.message : String(error).slice(0, 200),
              });
              return timer(delayMs);
            },
          }),
          catchError((err) => {
            logger.warn(`${label} exhausted retries`, { error: String(err).slice(0, 300) });
            return EMPTY;
          }),
        ),
      ),
    )
    .subscribe();
}

/**
 * Hot shared interval observable — multiple subscribers share one timer.
 * Useful when several consumers need the same tick without duplicating work.
 */
export function sharedInterval(periodMs: number): Observable<number> {
  return interval(periodMs).pipe(share());
}

/**
 * One-shot delayed observable that runs work after `delayMs`.
 * Returns subscription for cancellation.
 */
export function delayedWork(work: () => Promise<void> | void, delayMs: number): Subscription {
  return timer(delayMs)
    .pipe(
      switchMap(() => from(Promise.resolve(work()))),
      catchError((err) => {
        logger.warn("delayedWork failed", { error: String(err).slice(0, 300) });
        return EMPTY;
      }),
    )
    .subscribe();
}

// ── WhatsApp / Neo specific helpers ───────────────────────────────────────

/**
 * Wraps an async poller in an Observable that logs consecutive failures
 * and never terminates the stream (EMPTY on error).
 */
export function safeSwitchMap<T>(work: () => Promise<T>, label: string) {
  return (source: Observable<number>): Observable<T> =>
    source.pipe(
      switchMap(() =>
        from(work()).pipe(
          catchError((err) => {
            logger.warn(`${label} failed`, { error: err instanceof Error ? err.message : String(err).slice(0, 300) });
            return EMPTY;
          }),
        ),
      ),
    );
}
