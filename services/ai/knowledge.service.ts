import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ObjectId, type Db, type WithId } from "mongodb";
import { DB_COLLECTIONS } from "@/lib/constants";
import { embedText } from "@/services/ai/nvidia.service";

export interface KnowledgeDocument {
  id: string;
  organizationId: string;
  title: string;
  category: string;
  content: string;
}

interface KnowledgeDocRecord {
  _id?: ObjectId;
  organizationId: string;
  title: string;
  category: string;
  content: string;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

function toDocument(doc: WithId<KnowledgeDocRecord>): KnowledgeDocument {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    title: doc.title,
    category: doc.category,
    content: doc.content,
  };
}

function knowledgeCollection(db: Db) {
  return db.collection<KnowledgeDocRecord>(DB_COLLECTIONS.knowledgeDocuments);
}

function asId(value: string): string | ObjectId {
  try {
    return new ObjectId(value);
  } catch {
    return value;
  }
}

const SEED_FILE = join(process.cwd(), "knowledge", "default.md");

let fileSeed: string | null = null;

function defaultSeedContent(): string {
  if (fileSeed) return fileSeed;
  try {
    fileSeed = readFileSync(SEED_FILE, "utf-8");
  } catch {
    fileSeed = "";
  }
  return fileSeed;
}

/**
 * Parses the seed markdown into documents. Each `## Heading` starts a new
 * document; its body is the content. Inline text before the first heading is
 * ignored.
 */
export function parseSeedMarkdown(markdown: string): {
  title: string;
  category: string;
  content: string;
}[] {
  const lines = markdown.split(/\r?\n/);
  const documents: { title: string; category: string; content: string }[] = [];
  let current: { title: string; category: string; content: string } | null = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current) documents.push(current);
      current = { title: heading[1].trim(), category: "clinic", content: "" };
      continue;
    }
    if (current) {
      current.content += (current.content ? "\n" : "") + line;
    }
  }
  if (current) documents.push(current);

  return documents
    .map((d) => ({ ...d, content: d.content.trim() }))
    .filter((d) => d.content.length > 0);
}

/**
 * Seeds the per-organization knowledge base from knowledge/default.md on first
 * use. Existing documents are left untouched so dashboard edits are respected.
 */
export async function ensureKnowledgeSeeded(db: Db, organizationId: string): Promise<void> {
  const collection = knowledgeCollection(db);
  const existing = await collection.countDocuments({ organizationId });
  if (existing > 0) return;

  const entries = parseSeedMarkdown(defaultSeedContent());
  if (entries.length === 0) return;

  const now = new Date();
  const docs = entries.map((entry) => ({
    organizationId,
    title: entry.title,
    category: entry.category,
    content: entry.content,
    createdAt: now,
    updatedAt: now,
  }));

  await collection.insertMany(docs);
}

export async function listKnowledgeDocuments(
  db: Db,
  organizationId: string
): Promise<KnowledgeDocument[]> {
  await ensureKnowledgeSeeded(db, organizationId);
  const docs = await knowledgeCollection(db)
    .find({ organizationId })
    .sort({ title: 1 })
    .toArray();
  return docs.map((d) => toDocument(d));
}

async function tryEmbedContent(db: Db, organizationId: string): Promise<void> {
  const collection = knowledgeCollection(db);
  const missing = await collection
    .find({ organizationId, embedding: { $exists: false } })
    .toArray();
  if (missing.length === 0) return;

  for (const doc of missing) {
    const embedding = await embedText(`${doc.title}\n${doc.content}`);
    if (embedding) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { embedding, updatedAt: new Date() } }
      );
    }
  }
}

export async function createKnowledgeDocument(
  db: Db,
  organizationId: string,
  input: { title: string; category: string; content: string }
): Promise<KnowledgeDocument> {
  const collection = knowledgeCollection(db);
  const now = new Date();
  const result = await collection.insertOne({
    organizationId,
    title: input.title,
    category: input.category || "clinic",
    content: input.content,
    createdAt: now,
    updatedAt: now,
  });
  const embedding = await embedText(`${input.title}\n${input.content}`);
  if (embedding) {
    await collection.updateOne({ _id: result.insertedId }, { $set: { embedding } });
  }
  const created = await collection.findOne({ _id: result.insertedId });
  return toDocument(created as WithId<KnowledgeDocRecord>);
}

export async function updateKnowledgeDocument(
  db: Db,
  organizationId: string,
  documentId: string,
  input: { title: string; category: string; content: string }
): Promise<KnowledgeDocument | null> {
  const collection = knowledgeCollection(db);
  const result = await collection.findOneAndUpdate(
    { _id: asId(documentId) as ObjectId, organizationId },
    {
      $set: {
        title: input.title,
        category: input.category || "clinic",
        content: input.content,
        updatedAt: new Date(),
      },
      $unset: { embedding: "" },
    },
    { returnDocument: "after" }
  );
  if (!result) return null;

  const embedding = await embedText(`${input.title}\n${input.content}`);
  if (embedding) {
    await collection.updateOne({ _id: result._id }, { $set: { embedding } });
  }
  return toDocument(result as WithId<KnowledgeDocRecord>);
}

export async function deleteKnowledgeDocument(
  db: Db,
  organizationId: string,
  documentId: string
): Promise<boolean> {
  const result = await knowledgeCollection(db).deleteOne({
    _id: asId(documentId) as ObjectId,
    organizationId,
  });
  return result.deletedCount > 0;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1)
  );
}

function keywordScore(query: string, content: string): number {
  const queryTokens = tokenize(query);
  const contentTokens = tokenize(content);
  if (queryTokens.size === 0) return 0;
  let hits = 0;
  for (const token of queryTokens) {
    if (contentTokens.has(token)) hits++;
  }
  return hits / queryTokens.size;
}

/**
 * Keyword relevance of a query against a text. Used by the backend
 * knowledge-boundary gate to decide whether the soul.md (or any retrieved
 * content) plausibly covers the customer's question before the agent is even
 * called. Returns a value in [0, 1].
 */
export function contentRelevance(query: string, content: string): number {
  return keywordScore(query, content);
}

const RETRIEVAL_MIN_SCORE = 0.18;
const RETRIEVAL_TOP_K = 3;

export interface KnowledgeHit {
  id: string;
  title: string;
  category: string;
  content: string;
  score: number;
}

/**
 * Retrieves the most relevant knowledge-base documents for a query.
 * - Uses hybrid scoring: cosine similarity over embeddings (when available)
 *   blended with keyword overlap so facts still resolve without an API key.
 * - Returns an empty array when nothing scores above the relevance threshold,
 *   which lets callers return the standard not-found reply without an LLM call.
 */
export async function retrieveKnowledge(
  db: Db,
  organizationId: string,
  query: string,
  topK: number = RETRIEVAL_TOP_K
): Promise<KnowledgeHit[]> {
  await ensureKnowledgeSeeded(db, organizationId);
  await tryEmbedContent(db, organizationId);

  const docs = await knowledgeCollection(db)
    .find({ organizationId })
    .toArray();
  if (docs.length === 0) return [];

  const queryEmbedding = await embedText(query);
  const scored = docs.map((doc) => {
    const text = `${doc.title}\n${doc.content}`;
    const cosine = queryEmbedding && doc.embedding
      ? cosineSimilarity(queryEmbedding, doc.embedding)
      : 0;
    const keyword = keywordScore(query, text);
    const score = cosine > 0
      ? 0.6 * Math.max(0, cosine) + 0.4 * keyword
      : keyword;
    return { doc, score };
  });

  return scored
    .filter(({ score }) => score >= RETRIEVAL_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ doc, score }) => ({
      id: doc._id.toString(),
      title: doc.title,
      category: doc.category,
      content: doc.content,
      score,
    }));
}
