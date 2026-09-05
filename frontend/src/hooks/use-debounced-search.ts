"use client";

/**
 * ReactiveX debounced search hook — replaces imperative setTimeout debouncing
 * with a declarative Observable pipeline.
 *
 * https://reactivex.io/documentation/operators/debounce.html
 * https://rxjs.dev/api/operators/debounceTime
 *
 *   debounceTime(300) → distinctUntilChanged() → switchMap(fetch)
 *                ↕                          ↕               ↕
 *            CREATE (Subject)          COMBINE         LISTEN (subscribe)
 *
 * Features:
 * - debounceTime(300ms) by default — user stops typing before we fire
 * - distinctUntilChanged — no duplicate requests for same query
 * - switchMap — cancels in-flight fetch when query changes
 * - catches errors and returns EMPTY so stream never dies
 */

import { useEffect, useState, useMemo } from "react";
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of, tap } from "rxjs";

export interface UseDebouncedSearchOptions<T> {
  debounceMs?: number;
  fetcher: (query: string) => Promise<T>;
  initialQuery?: string;
}

export interface UseDebouncedSearchReturn<T> {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useDebouncedSearch<T>({
  debounceMs = 300,
  fetcher,
  initialQuery = "",
}: UseDebouncedSearchOptions<T>): UseDebouncedSearchReturn<T> {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable Subject — survives re-renders
  const input$ = useMemo(() => new Subject<string>(), []);

  // Push raw query into the stream on every keystroke
  useEffect(() => {
    input$.next(query);
  }, [query, input$]);

  useEffect(() => {
    const sub = input$
      .pipe(
        debounceTime(debounceMs),
        distinctUntilChanged(),
        tap((q) => {
          setDebouncedQuery(q);
          setLoading(true);
          setError(null);
        }),
        switchMap((q) =>
          fetcher(q)
            .then((d) => ({ ok: true as const, data: d }))
            .catch((e) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) })),
        ),
        catchError((err) => {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
          return of(null);
        }),
      )
      .subscribe((result) => {
        setLoading(false);
        if (!result) return;
        if (result.ok) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error);
        }
      });

    return () => sub.unsubscribe();
  }, [input$, debounceMs, fetcher]);

  // Complete subject on unmount
  useEffect(() => () => input$.complete(), [input$]);

  return { query, setQuery, debouncedQuery, data, loading, error };
}

/**
 * Lightweight version that only debounces the query string (no fetch).
 * Useful when parent drives the fetch (e.g. server pagination).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const subject = new Subject<T>();
    const sub = subject.pipe(debounceTime(delayMs), distinctUntilChanged()).subscribe((v) => setDebounced(v as T));
    subject.next(value);
    return () => {
      sub.unsubscribe();
      subject.complete();
    };
  }, [value, delayMs]);

  return debounced;
}
