/**
 * ReactiveX Event Bus — RxJS implementation of the Observer + Iterator patterns
 * for MyClinics domain events.
 *
 * https://reactivex.io/documentation/subject.html
 * https://reactivex.io/documentation/operators.html
 *
 * Every clinic mutation (appointment, patient, queue, WhatsApp) emits a typed
 * event into a shared Subject. Consumers subscribe with Rx operators:
 *   filter → map → debounceTime → switchMap → retry → etc.
 *
 * Tenant isolation: each event carries `clinicId`. Subscribe with
 * `eventsFor(clinicId)` to get an Observable scoped to one tenant.
 * The raw Subject is never exposed.
 */
import {
  Subject,
  Observable,
  filter,
  map,
  share,
  type Subscription,
} from "rxjs";

// ── Event types ────────────────────────────────────────────────────────────

export type ClinicEventType =
  | "appointment.created"
  | "appointment.updated"
  | "appointment.cancelled"
  | "appointment.completed"
  | "appointment.checked_in"
  | "appointment.called"
  | "queue.updated"
  | "patient.created"
  | "patient.updated"
  | "billing.created"
  | "billing.paid"
  | "whatsapp.message"
  | "whatsapp.sent"
  | "whatsapp.failed"
  | "reminder.queued"
  | "reminder.sent"
  | "notification.enqueued"
  | "neo.event"
  | "neo.incident";

export interface ClinicEvent<T = unknown> {
  type: ClinicEventType;
  clinicId: string | null;
  payload: T;
  timestamp: Date;
  actorId?: string | null;
}

// ── Bus ───────────────────────────────────────────────────────────────────

class ClinicEventBus {
  private readonly subject = new Subject<ClinicEvent>();

  /** Observable stream of all events (cold — share() multicasts). */
  readonly events$: Observable<ClinicEvent> = this.subject.asObservable().pipe(share());

  /** Emit a typed event into the stream. */
  emit<T>(type: ClinicEventType, clinicId: string | null, payload: T, actorId?: string | null): void {
    this.subject.next({ type, clinicId, payload, timestamp: new Date(), actorId });
  }

  /** Observable filtered to a single clinic (tenant isolation). */
  eventsFor(clinicId: string): Observable<ClinicEvent> {
    return this.events$.pipe(filter((e) => e.clinicId === clinicId));
  }

  /** Observable filtered by event type(s). */
  ofType(...types: ClinicEventType[]): Observable<ClinicEvent> {
    const set = new Set(types);
    return this.events$.pipe(filter((e) => set.has(e.type)));
  }

  /** Scoped + typed in one call — the most common subscription. */
  eventsForType(clinicId: string, ...types: ClinicEventType[]): Observable<ClinicEvent> {
    const set = new Set(types);
    return this.events$.pipe(filter((e) => e.clinicId === clinicId && set.has(e.type)));
  }

  /** Map helper: subscribe to a clinic's events and pluck payload as typed T. */
  payloadFor<T>(clinicId: string, ...types: ClinicEventType[]): Observable<T> {
    return this.eventsForType(clinicId, ...types).pipe(map((e) => e.payload as T));
  }

  /** Returns number of observers — useful for health checks / tests. */
  observerCount(): number {
    // Subject is internal; expose via events$ subscription count indirectly
    // RxJS 7: observers length on Subject
    return (this.subject as unknown as { observers: unknown[] }).observers?.length ?? 0;
  }

  /** Complete the Subject — call on shutdown only. */
  complete(): void {
    this.subject.complete();
  }
}

// Singleton — one bus per process (API server + worker each have one).
let singleton: ClinicEventBus | null = null;

export function getEventBus(): ClinicEventBus {
  if (!singleton) singleton = new ClinicEventBus();
  return singleton;
}

/** Convenience: emit without importing getEventBus every time. */
export function emitClinicEvent<T>(
  type: ClinicEventType,
  clinicId: string | null,
  payload: T,
  actorId?: string | null,
): void {
  getEventBus().emit(type, clinicId, payload, actorId);
}

/** Helper for Fastify handlers — creates a one-shot observable that resolves on next event. */
export function once<T>(obs: Observable<T>, timeoutMs = 30_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let sub: Subscription | null = null;
    const timer = setTimeout(() => {
      sub?.unsubscribe();
      reject(new Error("once() timeout waiting for event"));
    }, timeoutMs);
    sub = obs.subscribe({
      next(v) {
        clearTimeout(timer);
        sub?.unsubscribe();
        resolve(v);
      },
      error(e) {
        clearTimeout(timer);
        sub?.unsubscribe();
        reject(e);
      },
    });
  });
}
