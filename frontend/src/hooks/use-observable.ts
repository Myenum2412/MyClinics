"use client";

/**
 * ReactiveX hook — bridge RxJS Observable → React state
 * https://reactivex.io/documentation/observable.html
 * https://rxjs.dev/guide/observable
 *
 * Subscribes to an Observable and re-renders on each emission.
 * Cleanup is automatic via Subscription.unsubscribe() on unmount or deps change.
 */

import { useEffect, useState, useMemo } from "react";
import { Observable, BehaviorSubject, Subject } from "rxjs";

/**
 * Subscribe to an Observable and get its latest value.
 * Returns `initialValue` until first emission.
 */
export function useObservable<T>(observable: Observable<T>, initialValue: T): T {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const sub = observable.subscribe((v) => setValue(v));
    return () => sub.unsubscribe();
  }, [observable]);

  return value;
}

/**
 * Subscribe to an Observable and get its latest value or undefined before first emit.
 */
export function useObservableValue<T>(observable: Observable<T>): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = observable.subscribe((v) => setValue(v));
    return () => sub.unsubscribe();
  }, [observable]);
  return value;
}

/**
 * Creates a stable Subject that survives re-renders and completes on unmount.
 * Use to push imperative events (input onChange, button clicks) into an Rx stream.
 *
 *   const input$ = useSubject<string>();
 *   // onChange: input$.next(e.target.value)
 *   // stream: input$.pipe(debounceTime(300), distinctUntilChanged(), switchMap(fetch))
 */
export function useSubject<T>(): Subject<T> {
  const subject = useMemo(() => new Subject<T>(), []);
  useEffect(() => () => subject.complete(), [subject]);
  return subject;
}

/**
 * Creates a stable BehaviorSubject with an initial value.
 */
export function useBehaviorSubject<T>(initial: T): BehaviorSubject<T> {
  const subject = useMemo(() => new BehaviorSubject<T>(initial), []);
  useEffect(() => () => subject.complete(), [subject]);
  return subject;
}
