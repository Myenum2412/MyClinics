import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "mongodb";
import { DB_COLLECTIONS, KNOWLEDGE_NOT_FOUND_REPLY } from "@/lib/constants";

export const SOUL_NAME = "default";

let fileSoul: string | null = null;

function defaultSoulContent(): string {
  if (fileSoul) return fileSoul;
  try {
    fileSoul = readFileSync(join(process.cwd(), "souls", "default.md"), "utf-8");
  } catch {
    fileSoul = "";
  }
  return fileSoul;
}

export interface SoulRecord {
  id: string;
  organizationId: string;
  name: string;
  content: string;
  fallbackReply: string;
  version: number;
}

function toSoul(doc: {
  _id: { toString(): string };
  organizationId: string;
  name: string;
  content: string;
  fallbackReply?: string;
  version?: number;
}): SoulRecord {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    content: doc.content,
    fallbackReply:
      typeof doc.fallbackReply === "string" && doc.fallbackReply.trim()
        ? doc.fallbackReply.trim()
        : KNOWLEDGE_NOT_FOUND_REPLY,
    version: doc.version ?? 1,
  };
}

/**
 * Returns the active soul for an organization.
 * Seeds the default soul from souls/default.md on first use per organization.
 * Every organization always gets its own soul — souls are never shared across
 * organizations, which guarantees tenant isolation.
 */
export async function getSoul(db: Db, organizationId: string): Promise<SoulRecord> {
  const souls = db.collection(DB_COLLECTIONS.souls);
  const existing = await souls.findOne({ organizationId, isActive: true });

  if (existing) {
    return toSoul(existing as never);
  }

  const content = defaultSoulContent();
  const result = await souls.insertOne({
    organizationId,
    name: SOUL_NAME,
    content,
    fallbackReply: KNOWLEDGE_NOT_FOUND_REPLY,
    version: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const inserted = await souls.findOne({ _id: result.insertedId });
  return toSoul(inserted as never);
}

/**
 * Updates the active soul content (and optional configured fallback reply) for
 * an organization and bumps the version. Used by the dashboard settings page.
 */
export async function updateSoul(
  db: Db,
  organizationId: string,
  content: string,
  fallbackReply?: string
): Promise<SoulRecord> {
  const souls = db.collection(DB_COLLECTIONS.souls);
  const update: Record<string, unknown> = { content, updatedAt: new Date() };
  if (typeof fallbackReply === "string" && fallbackReply.trim()) {
    update.fallbackReply = fallbackReply.trim();
  }
  await souls.updateOne(
    { organizationId, isActive: true },
    { $set: update, $inc: { version: 1 } }
  );

  const updated = await souls.findOne({ organizationId, isActive: true });
  if (!updated) {
    return getSoul(db, organizationId);
  }
  return toSoul(updated as never);
}
