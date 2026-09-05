/**
 * Clinic live-data helpers built on ReactiveX — https://reactivex.io
 *
 * Polling as Observable (CREATE → COMBINE → LISTEN)
 * Replaces imperative setInterval + manual abort with declarative streams.
 */
import { Observable, share } from "rxjs";

/**
 * Creates a polling Observable that emits fetcher() every periodMs,
 * starting immediately. Multiple subscribers share the same timer.
 *
 *   const queue$ = useMemo(() => createPollingObservable(() => getAppointmentQueue(clinicId), 10_000), [clinicId]);
 *   const queue = useObservable(queue$, null);
 */
export function createPollingObservable<T>(fetcher: () => Promise<T>, periodMs: number): Observable<T> {
  return new Observable<T>((subscriber) => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await fetcher();
        if (!cancelled) subscriber.next(data);
      } catch {
        // keep polling — consumer can add catchError if needed
      }
    };
    void run();
    const id = setInterval(() => void run(), periodMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }).pipe(share());
}

/**
 * SSE (Server-Sent Events) as Observable — wraps EventSource.
 * EventSource auto-reconnects; we keep the Observable alive.
 */
export function fromEventSource<T>(url: string): Observable<T> {
  return new Observable<T>((subscriber) => {
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        subscriber.next(JSON.parse(ev.data) as T);
      } catch {
        // ignore malformed frames
      }
    };
    // EventSource auto-reconnects; don't terminate the Observable on error
    es.onerror = () => {};
    return () => es.close();
  });
}
