/**
 * ReactiveX barrel for the frontend — https://reactivex.io
 * Re-exports RxJS primitives + provides clinic-specific helpers.
 *
 * Usage:
 *   import { Subject, debounceTime, switchMap } from "@/src/lib/rx";
 *   import { useObservable, useSubject } from "@/src/hooks/use-observable";
 */

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
  delay,
  delayWhen,
} from "rxjs";

export { useObservable, useObservableValue, useSubject, useBehaviorSubject } from "@/src/hooks/use-observable";
export { useDebouncedSearch, useDebouncedValue } from "@/src/hooks/use-debounced-search";

// ── Clinic live polling as Observable ─────────────────────────────────────
//
// Helpers are intentionally kept tiny — the real value is in the operator
// composition (debounceTime, switchMap, catchError) shown above.
