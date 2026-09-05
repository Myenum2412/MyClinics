"use client";

/**
 * ReactiveX search input — https://reactivex.io/documentation/operators/debounce.html
 *
 * Replaces imperative setTimeout debouncing with:
 *   Subject → debounceTime(300) → distinctUntilChanged → switchMap(fetch) → tap
 *
 * Properties of a nice Rx stream:
 * - CREATE: Subject as source of keystrokes
 * - COMBINE: operators compose query handling
 * - LISTEN: subscribe updates React state
 */
import { useEffect, useMemo, useState } from "react";
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of, tap } from "rxjs";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export function ReactiveSearch({
  placeholder = "Search…",
  debounceMs = 300,
  onQueryChange,
  initialQuery = "",
}: {
  placeholder?: string;
  debounceMs?: number;
  onQueryChange: (debouncedQuery: string) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const subject = useMemo(() => new Subject<string>(), []);

  useEffect(() => {
    const sub = subject
      .pipe(debounceTime(debounceMs), distinctUntilChanged())
      .subscribe((q) => onQueryChange(q));
    // push initial
    subject.next(initialQuery);
    return () => sub.unsubscribe();
  }, [subject, debounceMs, onQueryChange, initialQuery]);

  // Keep Rx stream in sync with local input, but don't wire query as dep to avoid loops
  useEffect(() => {
    subject.next(query);
  }, [query, subject]);

  useEffect(() => () => subject.complete(), [subject]);

  return (
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="pl-9 h-9" />
      {query && (
        <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Variant with built-in fetcher — shows loading state via Rx tap + switchMap.
 */
export function ReactiveSearchWithFetcher<T>({
  fetcher,
  debounceMs = 300,
  placeholder = "Search…",
  renderResult,
}: {
  fetcher: (q: string) => Promise<T[]>;
  debounceMs?: number;
  placeholder?: string;
  renderResult: (items: T[], loading: boolean) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const subject = useMemo(() => new Subject<string>(), []);

  useEffect(() => {
    const sub = subject
      .pipe(
        debounceTime(debounceMs),
        distinctUntilChanged(),
        tap(() => setLoading(true)),
        switchMap((q) =>
          fetcher(q)
            .then((d) => ({ ok: true as const, data: d }))
            .catch(() => ({ ok: true as const, data: [] as T[] })),
        ),
        catchError(() => of({ ok: true as const, data: [] as T[] })),
      )
      .subscribe((res) => {
        setLoading(false);
        setItems(res.data);
      });
    subject.next("");
    return () => sub.unsubscribe();
  }, [subject, debounceMs, fetcher]);

  useEffect(() => {
    subject.next(query);
  }, [query, subject]);

  useEffect(() => () => subject.complete(), [subject]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="pl-9 h-9" />
      </div>
      {renderResult(items, loading)}
    </div>
  );
}
