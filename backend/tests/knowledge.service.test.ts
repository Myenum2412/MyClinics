import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFakeDb } from "./helpers/fake-db";
import {
  parseSeedMarkdown,
  ensureKnowledgeSeeded,
  listKnowledgeDocuments,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument,
  retrieveKnowledge,
  contentRelevance,
} from "@/services/ai/knowledge.service";
import { embedText } from "@/services/ai/nvidia.service";

vi.mock("@/services/ai/nvidia.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/ai/nvidia.service")>();
  return { ...actual, embedText: vi.fn() };
});

const mockedEmbed = vi.mocked(embedText);

const SAMPLE_MARKDOWN = [
  "# Clinic Knowledge Base",
  "",
  "## Location",
  "The clinic is located at 42 Green Park Road, Kochi.",
  "",
  "## Consultation fees",
  "A standard consultation fee is Rs. 500 per visit.",
].join("\n");

function fakeEmbedding(seed: number, length = 8): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    out.push(Math.sin(seed * 13 + i * 7) * 0.1);
  }
  return out;
}

describe("parseSeedMarkdown", () => {
  it("splits the seed markdown into documents by ## heading", () => {
    const docs = parseSeedMarkdown(SAMPLE_MARKDOWN);
    expect(docs).toHaveLength(2);
    expect(docs[0].title).toBe("Location");
    expect(docs[0].content).toContain("42 Green Park Road");
    expect(docs[1].title).toBe("Consultation fees");
  });

  it("drops contentless sections", () => {
    const docs = parseSeedMarkdown("## Empty\n\n## Real\nSome content here.");
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe("Real");
  });
});

describe("knowledge base CRUD", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("seeds once and lists documents", async () => {
    const { db } = await createFakeDb();
    await ensureKnowledgeSeeded(db, "org-1");
    const first = await listKnowledgeDocuments(db, "org-1");
    const second = await listKnowledgeDocuments(db, "org-1");
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBe(first.length);
  });

  it("creates, updates and deletes a document scoped to the organization", async () => {
    mockedEmbed.mockResolvedValue(fakeEmbedding(1));
    const { db } = await createFakeDb();

    const created = await createKnowledgeDocument(db, "org-1", {
      title: "Parking",
      category: "clinic",
      content: "Free parking is available in the basement.",
    });
    expect(created.id).toBeTruthy();

    const org1Docs = await listKnowledgeDocuments(db, "org-1");
    expect(org1Docs.some((d) => d.id === created.id)).toBe(true);
    expect(org1Docs.find((d) => d.id === created.id)?.content).toContain("Free parking");

    const org2Docs = await listKnowledgeDocuments(db, "org-2");
    expect(org2Docs.some((d) => d.id === created.id)).toBe(false);

    const updated = await updateKnowledgeDocument(db, "org-1", created.id, {
      title: "Parking",
      category: "clinic",
      content: "Paid parking is available next door.",
    });
    expect(updated?.content).toContain("Paid parking");

    expect(await deleteKnowledgeDocument(db, "org-1", created.id)).toBe(true);
    const afterDelete = await listKnowledgeDocuments(db, "org-1");
    expect(afterDelete.some((d) => d.id === created.id)).toBe(false);
  });
});

describe("contentRelevance", () => {
  it("scores keyword overlap for a factual query", () => {
    expect(
      contentRelevance(
        "what are the consultation fees?",
        "The consultation fee is Rs. 500 per visit."
      )
    ).toBeGreaterThan(0);
  });

  it("returns 0 when nothing overlaps", () => {
    expect(
      contentRelevance("do you have parking?", "Be polite and answer customers.")
    ).toBe(0);
  });
});

describe("retrieveKnowledge", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns relevant documents via keyword scoring when embeddings are unavailable", async () => {
    mockedEmbed.mockResolvedValue(null);
    const { db } = await createFakeDb();
    await ensureKnowledgeSeeded(db, "org-1");

    const hits = await retrieveKnowledge(db, "org-1", "How much does a consultation cost?");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].title).toBe("Consultation fees");
  });

  it("returns an empty array when nothing matches the query", async () => {
    mockedEmbed.mockResolvedValue(null);
    const { db } = await createFakeDb();
    await ensureKnowledgeSeeded(db, "org-1");

    const hits = await retrieveKnowledge(db, "org-1", "zebra qwerty nothing relevant here");
    expect(hits).toEqual([]);
  });

  it("uses embeddings when available", async () => {
    const { db } = await createFakeDb();
    await ensureKnowledgeSeeded(db, "org-1");
    const docs = await listKnowledgeDocuments(db, "org-1");

    mockedEmbed.mockImplementation(async (text: string) => {
      const idx = docs.findIndex((d) => d.title === "Opening hours" || text.includes("hours"));
      return fakeEmbedding(idx >= 0 ? idx + 1 : 99);
    });

    const hits = await retrieveKnowledge(db, "org-1", "what time do you open?");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it("respects topK", async () => {
    mockedEmbed.mockResolvedValue(null);
    const { db } = await createFakeDb();
    await ensureKnowledgeSeeded(db, "org-1");
    const hits = await retrieveKnowledge(db, "org-1", "clinic", 1);
    expect(hits.length).toBeLessThanOrEqual(1);
  });
});
