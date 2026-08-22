import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db-pools";
import { requireAuth } from "@/plugins/auth";
import {
  createKnowledgeDocument,
  listKnowledgeDocuments,
  updateKnowledgeDocument,
  deleteKnowledgeDocument,
} from "@/services/ai/knowledge.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { cached, invalidateCache } from "@/lib/cache";
import { handleError } from "@/lib/http";

const MAX_TITLE_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 50;
const MAX_CONTENT_LENGTH = 20_000;

const knowledgeCacheKey = (orgId: string) => `knowledge:${orgId}`;
const KNOWLEDGE_CACHE_TTL_MS = 30_000;

function mapDoc(d: { id: string; title: string; category: string; content: string }) {
  return { id: d.id, title: d.title, category: d.category, content: d.content };
}

export function registerKnowledgeRoutes(app: FastifyInstance): void {
  app.get("/api/knowledge", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    try {
      const db = await getDb();
      const org = await ensureDefaultOrganization(db);
      const documents = await cached(
        knowledgeCacheKey(org.id),
        KNOWLEDGE_CACHE_TTL_MS,
        () => listKnowledgeDocuments(db, org.id)
      );
      return reply.send({ documents: documents.map(mapDoc) });
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  });

  app.post("/api/knowledge", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const content = typeof body?.content === "string" ? body.content.trim() : "";
      const category =
        typeof body?.category === "string" ? body.category.trim() : "clinic";

      if (!title) {
        return reply.code(400).send({ error: "Title is required" });
      }
      if (!content) {
        return reply.code(400).send({ error: "Content is required" });
      }
      if (title.length > MAX_TITLE_LENGTH) {
        return reply.code(400).send({
          error: `Title must be under ${MAX_TITLE_LENGTH} characters`,
        });
      }
      if (category.length > MAX_CATEGORY_LENGTH) {
        return reply.code(400).send({
          error: `Category must be under ${MAX_CATEGORY_LENGTH} characters`,
        });
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        return reply.code(400).send({
          error: `Content must be under ${MAX_CONTENT_LENGTH} characters`,
        });
      }

      const db = await getDb();
      const org = await ensureDefaultOrganization(db);
      const document = await createKnowledgeDocument(db, org.id, {
        title,
        category,
        content,
      });

      invalidateCache(knowledgeCacheKey(org.id));

      return reply.send({ document: mapDoc(document) });
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  });

  app.put("/api/knowledge/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const content = typeof body?.content === "string" ? body.content.trim() : "";
      const category =
        typeof body?.category === "string" ? body.category.trim() : "clinic";

      if (!title || !content) {
        return reply.code(400).send({
          error: "Title and content are required",
        });
      }
      if (title.length > MAX_TITLE_LENGTH || content.length > MAX_CONTENT_LENGTH) {
        return reply.code(400).send({ error: "Title or content is too long" });
      }
      if (category.length > MAX_CATEGORY_LENGTH) {
        return reply.code(400).send({
          error: `Category must be under ${MAX_CATEGORY_LENGTH} characters`,
        });
      }

      const db = await getDb();
      const org = await ensureDefaultOrganization(db);
      const document = await updateKnowledgeDocument(db, org.id, id, {
        title,
        category,
        content,
      });
      if (!document) {
        return reply.code(404).send({ error: "Document not found" });
      }

      invalidateCache(knowledgeCacheKey(org.id));

      return reply.send({ document: mapDoc(document) });
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  });

  app.delete("/api/knowledge/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    try {
      const { id } = request.params as { id: string };
      const db = await getDb();
      const org = await ensureDefaultOrganization(db);
      const deleted = await deleteKnowledgeDocument(db, org.id, id);
      if (!deleted) {
        return reply.code(404).send({ error: "Document not found" });
      }

      invalidateCache(knowledgeCacheKey(org.id));

      return reply.send({ ok: true });
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  });
}