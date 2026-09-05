/**
 * ReactiveX demo page — https://reactivex.io
 *
 * Showcases the three ReactiveX pillars on MyClinics:
 *  CREATE  — Subjects & interval/timer as event sources
 *  COMBINE — debounceTime, distinctUntilChanged, switchMap, filter, share, catchError
 *  LISTEN  — subscribe → React state via useObservable / SSE EventSource
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Subject, debounceTime, distinctUntilChanged, map, filter, scan, interval, take } from "rxjs";
import { useObservable, useSubject } from "@/src/hooks/use-observable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LiveQueueRx } from "@/src/components/reactive/live-queue-rx";
import { ReactiveSearch } from "@/src/components/reactive/reactive-search";
import { useClinicSession } from "@/hooks/use-clinic-session";

function MarbleDemo() {
  const input$ = useSubject<string>();
  const [raw, setRaw] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const sub = input$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((v) => setDebounced(v));
    return () => sub.unsubscribe();
  }, [input$]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CREATE → COMBINE → LISTEN</CardTitle>
        <CardDescription>
          <code>Subject</code> → <code>debounceTime(400)</code> → <code>distinctUntilChanged()</code> → <code>subscribe</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={raw} onChange={(e) => { setRaw(e.target.value); input$.next(e.target.value); }} placeholder="Type fast — debounced value appears 400ms after you stop" />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-muted p-2">raw: <span className="font-mono">{raw || "—"}</span></div>
          <div className="rounded bg-primary/10 p-2">debounced: <span className="font-mono">{debounced || "—"}</span></div>
        </div>
        <p className="text-xs text-muted-foreground">ReactiveX docs: debounce, distinct, Subject — https://reactivex.io/documentation/operators.html</p>
      </CardContent>
    </Card>
  );
}

function CounterStreamDemo() {
  const clicks$ = useSubject<void>();
  const count$ = useMemo(() => clicks$.pipe(map(() => 1), scan((acc, v) => acc + v, 0)), [clicks$]);
  const count = useObservable(count$, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Observable counter (scan)</CardTitle>
        <CardDescription>
          <code>clicks$.pipe(map(_=&gt;1), scan((a,b)=&gt;a+b, 0))</code> — state as emission, no useState reducer
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button onClick={() => clicks$.next()}>Emit click</Button>
        <Badge variant="secondary" className="text-lg px-3 py-1">{count}</Badge>
        <span className="text-xs text-muted-foreground">Every click is an Observable emission.</span>
      </CardContent>
    </Card>
  );
}

function IntervalDemo() {
  const [ticks, setTicks] = useState<number[]>([]);
  const tick$ = useMemo(() => interval(1000).pipe(take(6)), []);

  useEffect(() => {
    const sub = tick$.subscribe((n) => setTicks((prev) => [...prev, n]));
    return () => sub.unsubscribe();
  }, [tick$]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interval Observable (Scheduler)</CardTitle>
        <CardDescription>
          <code>interval(1000).pipe(take(6))</code> — Scheduler abstraction over setInterval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1.5 flex-wrap">
          {ticks.map((t) => (
            <Badge key={t} variant="outline">{t}</Badge>
          ))}
          {ticks.length === 0 && <span className="text-xs text-muted-foreground">ticks appear every second…</span>}
          {ticks.length === 6 && <Badge variant="default">done</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RxDemoPage() {
  const { session } = useClinicSession();
  const [searchResult, setSearchResult] = useState("");

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ReactiveX — https://reactivex.io</h1>
        <p className="text-muted-foreground mt-1">
          An API for asynchronous programming with observable streams — integrated via{" "}
          <a href="https://rxjs.dev" target="_blank" rel="noreferrer" className="underline">RxJS 7</a> (the JavaScript port of ReactiveX).
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Badge>Frontend: rxjs 7.8 + hooks (useObservable, useSubject, useDebouncedSearch)</Badge>
          <Badge variant="secondary">Backend: Subject event bus + SSE + polling observables</Badge>
          <Badge variant="outline">Operators: debounceTime · distinctUntilChanged · switchMap · filter · scan · share · catchError</Badge>
        </div>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Where RxJS lives in MyClinics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li><code>backend/src/lib/rx/event-bus.ts</code> — Subject bus: appointment/queue events → SSE stream at <code>GET /api/clinics/:id/events/stream</code></li>
            <li><code>backend/src/lib/rx/polling.ts</code> — declarative polling: <code>timer(0, 30_000).pipe(switchMap, retry, catchError)</code> replaces setInterval</li>
            <li><code>backend/src/lib/rx/sse.ts</code> — Observable → EventSource bridge (<code>share()</code> multicasts)</li>
            <li><code>frontend/src/hooks/use-observable.ts</code> — Observable → React state bridge</li>
            <li><code>frontend/src/hooks/use-debounced-search.ts</code> — <code>Subject → debounceTime → distinctUntilChanged → switchMap</code> search</li>
            <li><code>frontend/src/components/reactive/live-queue-rx.tsx</code> — live queue: polling Observable + SSE <code>filter(queue.updated)</code></li>
          </ul>
          <div className="text-xs text-muted-foreground pt-2">
            API: <code>GET /api/clinics/:clinicId/events/stream</code> (SSE) + <code>GET /api/clinics/:clinicId/events/health</code> — see <code>frontend/src/lib/rx-helpers.ts</code> <code>fromEventSource</code>.
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <MarbleDemo />
        <CounterStreamDemo />
      </div>

      <IntervalDemo />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Debounced search (ReactiveSearch)</CardTitle>
          <CardDescription>Subject → debounceTime(300) → distinctUntilChanged → parent callback</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReactiveSearch placeholder="Type — debounced query logged below" onQueryChange={(q) => setSearchResult(q)} debounceMs={300} />
          <div className="rounded bg-muted p-2 text-sm font-mono">debounced query: {searchResult || "—"}</div>
          <div className="text-xs text-muted-foreground">Used in appointments/patients tables — eliminates setTimeout race + duplicate fetches via distinctUntilChanged + switchMap.</div>
        </CardContent>
      </Card>

      {session?.clinicId ? (
        <LiveQueueRx clinicId={session.clinicId} doctorId={session.doctorId} />
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Live Queue (SSE + Polling)</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Log in as a clinic user to see live queue events via the RxJS event bus SSE stream.</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Reference</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div>ReactiveX: <a className="underline" href="https://reactivex.io/" target="_blank" rel="noreferrer">https://reactivex.io/</a> · Observable, Operators, Subject, Scheduler — <a className="underline" href="https://reactivex.io/documentation/operators.html" target="_blank" rel="noreferrer">operators ref</a></div>
          <div>RxJS: <a className="underline" href="https://rxjs.dev" target="_blank" rel="noreferrer">https://rxjs.dev</a> · <code>npm i rxjs</code> already added to <code>frontend</code> + <code>@myclinics/backend</code></div>
        </CardContent>
      </Card>
    </div>
  );
}
