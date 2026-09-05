/**
 * ReactiveX barrel — https://reactivex.io
 *
 * Central re-export for RxJS-based reactive primitives used across the backend.
 * Import from "@/lib/rx" instead of "rxjs" directly to keep version pinning
 * and shared operators in one place.
 */

// Event bus (Subject / Observable / Observer pattern)
export {
  getEventBus,
  emitClinicEvent,
  once,
  type ClinicEvent,
  type ClinicEventType,
} from "./event-bus";

// Polling / Scheduler / interval operators
export {
  createPolling,
  createPollingWithRetry,
  sharedInterval,
  delayedWork,
  backoffMs,
  safeSwitchMap,
} from "./polling";

// Re-export commonly used RxJS creation functions & operators so callers
// don't need a second `from "rxjs"` import for composition.
export {
  Subject,
  BehaviorSubject,
  ReplaySubject,
  Observable,
  interval,
  timer,
  defer,
  from,
  of,
  EMPTY,
  NEVER,
  merge,
  combineLatest,
  forkJoin,
} from "rxjs";

export {
  map,
  filter,
  debounceTime,
  throttleTime,
  distinctUntilChanged,
  switchMap,
  mergeMap,
  concatMap,
  exhaustMap,
  catchError,
  retry,
  tap,
  share,
  shareReplay,
  take,
  takeUntil,
  first,
} from "rxjs";
