import type { Db, ObjectId } from "mongodb";
import { todayDateString } from "@/lib/stats";

export const QUEUE_STATUSES = ["pending", "confirmed"] as const;

export interface QueuedAppointment {
  id: string;
  fullName: string;
  whatsapp: string | null;
  mobile: string | null;
  date: string;
  time: string;
  doctorName: string | null;
  counter: number | null;
}

interface AppointmentDoc {
  _id: ObjectId;
  fullName?: unknown;
  whatsapp?: unknown;
  mobile?: unknown;
  date?: unknown;
  time?: unknown;
  doctorName?: unknown;
  status?: unknown;
  counter?: unknown;
  createdAt?: unknown;
}

function isQueued(status: unknown): boolean {
  return QUEUE_STATUSES.includes(status as (typeof QUEUE_STATUSES)[number]);
}

function byTimeThenCreated(a: AppointmentDoc, b: AppointmentDoc): number {
  const at = String(a.time ?? "");
  const bt = String(b.time ?? "");
  if (at !== bt) return at < bt ? -1 : 1;
  const ac = String(a.createdAt ?? "");
  const bc = String(b.createdAt ?? "");
  return ac < bc ? -1 : ac > bc ? 1 : 0;
}

function toQueued(doc: AppointmentDoc, counter: number): QueuedAppointment {
  return {
    id: doc._id.toString(),
    fullName: String(doc.fullName ?? ""),
    whatsapp: doc.whatsapp ? String(doc.whatsapp) : null,
    mobile: doc.mobile ? String(doc.mobile) : null,
    date: String(doc.date ?? ""),
    time: String(doc.time ?? ""),
    doctorName: doc.doctorName ? String(doc.doctorName) : null,
    counter,
  };
}

/**
 * Reassigns the queue counter # for one day. Active appointments (pending or
 * confirmed) are numbered 1..n in time order; everyone else loses their counter.
 * All writes are batched into a single bulkWrite.
 */
export async function reassignCounters(db: Db, date: string): Promise<void> {
  const all = await db
    .collection<AppointmentDoc>("appointments")
    .find({ date })
    .project<AppointmentDoc>({ _id: 1, time: 1, status: 1, counter: 1, createdAt: 1 })
    .toArray();

  const active = all
    .filter((doc) => isQueued(doc.status))
    .sort(byTimeThenCreated);

  const ops: Record<string, unknown>[] = [];

  for (const [index, doc] of active.entries()) {
    if (doc.counter !== index + 1) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { counter: index + 1 } },
        },
      });
    }
  }

  for (const doc of all) {
    if (!isQueued(doc.status) && doc.counter != null) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $unset: { counter: "" } },
        },
      });
    }
  }

  if (ops.length) {
    await db
      .collection("appointments")
      .bulkWrite(ops as never, { ordered: false });
  }
}

/** Appointments still waiting in today's queue, numbered 1..n in time order. */
export async function getTodayQueue(db: Db): Promise<QueuedAppointment[]> {
  const today = todayDateString();
  const docs = await db
    .collection<AppointmentDoc>("appointments")
    .find({ date: today, status: { $in: [...QUEUE_STATUSES] } })
    .sort({ time: 1, createdAt: 1 })
    .toArray();

  return docs.map((doc, index) =>
    toQueued(doc, typeof doc.counter === "number" ? doc.counter : index + 1)
  );
}

/** The next patient in the queue (earliest time still waiting). */
export async function getNextQueuedAppointment(
  db: Db,
  date: string
): Promise<QueuedAppointment | null> {
  const rows = await db
    .collection<AppointmentDoc>("appointments")
    .find({ date, status: { $in: [...QUEUE_STATUSES] } })
    .sort({ time: 1, createdAt: 1 })
    .limit(1)
    .toArray();

  const doc = rows[0];
  if (!doc) return null;
  return toQueued(doc, typeof doc.counter === "number" ? doc.counter : 1);
}
