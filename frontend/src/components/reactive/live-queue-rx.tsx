"use client";

/**
 * Live queue via ReactiveX
 * https://reactivex.io/documentation/observable.html
 *
 * Demonstrates polling as Observable + SSE as Observable.
 *
 * Two modes:
 * 1. Polling Observable: createPollingObservable(() => getAppointmentQueue(...), 10s)
 * 2. Push Observable:    fromEventSource(`/api/clinics/${clinicId}/events/stream`)
 *                        .pipe(filter(e => e.type === "queue.updated"))
 *
 * Polling Observable is CREATE (timer), COMBINE (share, catchError), LISTEN (useObservable).
 * SSE Observable is CREATE (EventSource), COMBINE (filter, map), LISTEN (subscribe).
 */
import { useEffect, useMemo, useState } from "react";
import { filter } from "rxjs";
import { useObservable } from "@/src/hooks/use-observable";
import { createPollingObservable, fromEventSource } from "@/src/lib/rx-helpers";
import type { QueueSnapshot } from "@/lib/clinic-api";
import { getAppointmentQueue } from "@/lib/clinic-api";
import { Badge } from "@/components/ui/badge";

export function LiveQueueRx({ clinicId, doctorId }: { clinicId: string; doctorId?: string | null }) {
  const [events, setEvents] = useState<string[]>([]);
  const [sseConnected, setSseConnected] = useState(false);

  // ── Polling Observable (fallback + initial load) ───────────────────────
  const queue$ = useMemo(
    () => createPollingObservable<QueueSnapshot>(() => getAppointmentQueue(clinicId, { doctorId: doctorId ?? undefined }), 10_000),
    [clinicId, doctorId],
  );
  const queue = useObservable<QueueSnapshot | null>(queue$ as unknown as import("rxjs").Observable<QueueSnapshot | null>, null);

  // ── Push Observable (SSE) — live queue.updated events ──────────────────
  useEffect(() => {
    if (!clinicId) return;
    const url = `/api/clinics/${clinicId}/events/stream`;
    const sub = fromEventSource<{ type: string; payload: unknown }>(url)
      .pipe(filter((e) => e.type === "queue.updated"))
      .subscribe({
        next: (e) => {
          setSseConnected(true);
          setEvents((prev) => [`${new Date().toLocaleTimeString()} — ${e.type} ${JSON.stringify(e.payload).slice(0, 80)}`, ...prev].slice(0, 10));
        },
        error: () => setSseConnected(false),
      });
    // EventSource open detection
    const timer = setTimeout(() => setSseConnected(true), 1500);
    return () => {
      clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [clinicId]);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Live Queue (ReactiveX)</h3>
        <div className="flex gap-2">
          <Badge variant={sseConnected ? "default" : "secondary"}>{sseConnected ? "SSE live" : "polling"}</Badge>
          <Badge variant="outline">RxJS queue$</Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-muted p-2">
          <div className="text-2xl font-bold">{queue?.counts.waiting ?? "—"}</div>
          <div className="text-xs text-muted-foreground">waiting</div>
        </div>
        <div className="rounded bg-muted p-2">
          <div className="text-2xl font-bold">{queue?.waiting.length ?? "—"}</div>
          <div className="text-xs text-muted-foreground">queued</div>
        </div>
        <div className="rounded bg-muted p-2">
          <div className="text-2xl font-bold">{queue?.current ? queue.current.patientName.split(" ")[0] : "—"}</div>
          <div className="text-xs text-muted-foreground">current</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">Recent queue.updated events (SSE → Rx filter)</div>
        {events.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">No events yet — try checking in or calling next.</div>
        ) : (
          <ul className="text-xs font-mono space-y-1 max-h-32 overflow-auto">
            {events.map((e, i) => (
              <li key={i} className="truncate text-muted-foreground">
                {e}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground">
        Polling Observable: <code>interval(10s).pipe(switchMap(fetch), share())</code> · Push Observable:{" "}
        <code>fromEventSource(url).pipe(filter(type == queue.updated))</code>
      </div>
    </div>
  );
}
