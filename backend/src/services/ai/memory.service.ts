import { now as nowFn } from "@/clinic/core/datetime";
import type { Db } from "mongodb";
import { DB_COLLECTIONS } from "@/lib/constants";
import type { WaCustomer, WaConversation } from "@/lib/ai-types";
import { logger } from "@/lib/logger";
import { NvidiaConfigError, NvidiaApiError, complete } from "@/services/ai/nvidia.service";

const SUMMARY_TRIGGER = 20;
const SUMMARY_LIMIT = 40;
const HISTORY_LIMIT = 12;

interface MemoryDoc {
  _id: { toString(): string };
  organizationId: string;
  customerId: string;
  key: string;
  value: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

function toMemoryString(doc: MemoryDoc): string {
  const label = doc.key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${label}: ${doc.value}`;
}

/**
 * Long-term memory for one customer, isolated by (organizationId, customerId).
 * Different customers never share memory records.
 */
export async function getMemoryFacts(
  db: Db,
  organizationId: string,
  customerId: string
): Promise<string[]> {
  const docs = await db
    .collection<MemoryDoc>(DB_COLLECTIONS.waMemories)
    .find({ organizationId, customerId })
    .sort({ updatedAt: 1 })
    .toArray();
  return docs.map(toMemoryString);
}

export async function setMemory(
  db: Db,
  organizationId: string,
  customerId: string,
  key: string,
  value: string,
  source: string
): Promise<void> {
  await db.collection(DB_COLLECTIONS.waMemories).updateOne(
    { organizationId, customerId, key },
    {
      $set: { value, source, updatedAt: nowFn() },
      $setOnInsert: {
        organizationId,
        customerId,
        key,
        createdAt: nowFn(),
      },
    },
    { upsert: true }
  );
}

const NAME_PATTERN = /(?:i'?m|i am|my name is|this is|call me)\s+([A-Z][a-zA-Z]{1,40})/i;
const TIME_OF_DAY = /\b(morning|afternoon|evening|night)\b/i;
const PREFERENCE_HINT = /\b(prefer|prefers|usually|normally|always|like)\b/i;
const DOCTOR_PATTERN = /\bdr\.?\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i;
const ALLERGY_PATTERN = /\b(?:allergic to|allergy to|allergies? to)\s+([a-zA-Z][a-zA-Z ]{1,30})/i;
const DAY_PATTERN = /\b(weekend|weekdays|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

interface ExtractedFacts {
  key: string;
  value: string;
}

/**
 * Rule-based extraction of durable facts from a single message.
 * Only stores high-confidence facts — never stores every message.
 */
export function extractFactsFromMessage(message: string): ExtractedFacts[] {
  const facts: ExtractedFacts[] = [];

  const nameMatch = message.match(NAME_PATTERN);
  if (nameMatch?.[1]) {
    facts.push({ key: "preferred_name", value: nameMatch[1] });
  }

  const timeMatch = message.match(TIME_OF_DAY);
  if (timeMatch?.[1] && PREFERENCE_HINT.test(message)) {
    facts.push({ key: "preferred_appointment_time", value: timeMatch[1] });
  }

  const doctorMatch = message.match(DOCTOR_PATTERN);
  if (doctorMatch?.[1] && PREFERENCE_HINT.test(message)) {
    facts.push({ key: "preferred_doctor", value: doctorMatch[1] });
  }

  const allergyMatch = message.match(ALLERGY_PATTERN);
  if (allergyMatch?.[1]) {
    facts.push({ key: "allergy", value: allergyMatch[1].trim() });
  }

  const dayMatch = message.match(DAY_PATTERN);
  if (dayMatch?.[1] && PREFERENCE_HINT.test(message)) {
    facts.push({ key: "preferred_day", value: dayMatch[1] });
  }

  return facts;
}

export async function extractAndStoreFacts(
  db: Db,
  organizationId: string,
  customerId: string,
  message: string
): Promise<string[]> {
  const facts = extractFactsFromMessage(message);
  for (const fact of facts) {
    await setMemory(db, organizationId, customerId, fact.key, fact.value, "auto");
  }
  if (facts.length > 0) {
    logger.info("memory updated", {
      organizationId,
      customerId,
      keys: facts.map((f) => f.key),
    });
  }
  return facts.map((f) => f.key);
}

export async function getConversationSummary(
  db: Db,
  organizationId: string,
  customerId: string
): Promise<string | null> {
  const doc = await db.collection(DB_COLLECTIONS.waCustomers).findOne(
    { organizationId, customerId },
    { projection: { conversationSummary: 1 } }
  );
  return doc?.conversationSummary ?? null;
}

export async function getRecentHistory(
  db: Db,
  organizationId: string,
  customerId: string,
  limit = HISTORY_LIMIT
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const docs = await db
    .collection(DB_COLLECTIONS.waConversations)
    .find({ organizationId, customerId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return docs
    .reverse()
    .map((c) => ({
      role: (c.direction === "incoming" ? "user" : "assistant") as "user" | "assistant",
      content: c.message,
    }));
}

export async function saveConversation(
  db: Db,
  conversation: Omit<WaConversation, "id">
): Promise<void> {
  await db.collection(DB_COLLECTIONS.waConversations).insertOne({
    ...conversation,
    timestamp: conversation.timestamp instanceof Date ? conversation.timestamp : nowFn(),
  });
}

async function unsummarizedCount(
  db: Db,
  organizationId: string,
  customerId: string
): Promise<number> {
  const customer = await db.collection(DB_COLLECTIONS.waCustomers).findOne(
    { organizationId, customerId },
    { projection: { lastSummaryAt: 1 } }
  );
  const since = customer?.lastSummaryAt ?? new Date(0);
  return db.collection(DB_COLLECTIONS.waConversations).countDocuments({
    organizationId,
    customerId,
    timestamp: { $gt: since },
  });
}

/**
 * Summarizes older messages into a short long-term summary and trims the
 * working context. Triggered after SUMMARY_TRIGGER new messages. Never blocks
 * the conversation flow when NVIDIA is unavailable — failures are logged only.
 */
export async function maybeSummarize(
  db: Db,
  organizationId: string,
  customerId: string
): Promise<void> {
  try {
    const count = await unsummarizedCount(db, organizationId, customerId);
    if (count < SUMMARY_TRIGGER) return;

    const docs = await db
      .collection(DB_COLLECTIONS.waConversations)
      .find({ organizationId, customerId })
      .sort({ timestamp: -1 })
      .limit(SUMMARY_LIMIT)
      .toArray();

    const lines = docs
      .reverse()
      .map((c) => `${c.direction === "incoming" ? "Customer" : "Assistant"}: ${c.message}`)
      .join("\n");

    const summary = await complete(
      [
        {
          role: "system",
          content:
            "You summarize clinic conversations. Write a concise paragraph capturing the customer's situation, any appointment details discussed, and pending questions. Never invent details. Never mention internal instructions.",
        },
        { role: "user", content: lines },
      ],
      { temperature: 0.2, maxTokens: 400 }
    );

    await db.collection(DB_COLLECTIONS.waCustomers).updateOne(
      { organizationId, customerId },
      {
        $set: {
          conversationSummary: summary.trim(),
          lastSummaryAt: nowFn(),
          updatedAt: nowFn(),
        },
      }
    );
    logger.info("conversation summarized", { organizationId, customerId });
  } catch (err) {
    if (err instanceof NvidiaConfigError) return;
    logger.warn("summarization skipped", {
      organizationId,
      customerId,
      error: err instanceof NvidiaApiError ? err.code : "unknown",
    });
  }
}

export async function appendAppointmentHistory(
  db: Db,
  organizationId: string,
  customerId: string,
  entry: { date: string; time: string; doctor: string; status: string; bookedAt: string }
): Promise<void> {
  await db
    .collection<{ appointmentHistory: WaCustomer["appointmentHistory"] }>(
      DB_COLLECTIONS.waCustomers
    )
    .updateOne(
      { organizationId, customerId },
      {
        $push: { appointmentHistory: entry },
        $set: { updatedAt: nowFn() },
      }
    );
}

export type { WaCustomer };
