# ReactiveX in MyClinics — https://reactivex.io

RxJS 7.8 (ReactiveX for JavaScript) — the Observer + Iterator + functional composition.

## Backend — `backend/src/lib/rx/`

- `event-bus.ts` — `Subject<ClinicEvent>` singleton. Tenants emit `ClinicEvent`:
  `emitClinicEvent("queue.updated", clinicId, payload)`. Subscribers use Rx operators:
  `bus.eventsFor(clinicId).pipe(filter(e=>e.type==="queue.updated"), map(...), share())`
- `polling.ts` — `createPolling`, `createPollingWithRetry`, `sharedInterval`, `delayedWork`
  Replace `setInterval` loops with `timer(0, period).pipe(switchMap(work), retry, catchError)`.
  Used for reminders / WhatsApp command polling / Neo queue draining.
- `sse.ts` — `streamAsSSE(req, reply, observable)` — Observable → `text/event-stream`.
- `index.ts` — barrel re-export.

SSE endpoint: `GET /api/clinics/:clinicId/events/stream` (see `clinic/modules/events/events.routes.ts`).
Emits on every appointment/queue mutation via `AppointmentService`.

## Frontend — `frontend/src/`

- `hooks/use-observable.ts` — `useObservable(observable, init)` → React state, auto unsub.
- `hooks/use-debounced-search.ts` — `Subject → debounceTime(300) → distinctUntilChanged → switchMap(fetch)`
- `lib/rx-helpers.ts` — `createPollingObservable(fetcher, 10_000).pipe(share())` + `fromEventSource(url)`
- `components/reactive/reactive-search.tsx` — `<ReactiveSearch onQueryChange={debounced}>`
- `components/reactive/live-queue-rx.tsx` — live queue: polling Observable + SSE `filter(queue.updated)`
- `app/rx-demo/page.tsx` — interactive demo: Subject, debounceTime, scan, interval, SSE.

## Operators used (reactivex.io/documentation/operators.html)

CREATE: Subject, BehaviorSubject, interval, timer, from, defer, Observable.create
COMBINE: debounceTime, distinctUntilChanged, switchMap, mergeMap, filter, map, scan, share, shareReplay
LISTEN: subscribe, tap, catchError, retry

See https://reactivex.io and https://rxjs.dev
