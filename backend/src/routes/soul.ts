import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/plugins/auth";
import { getSoul, updateSoul } from "@/services/ai/soul.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { cached, invalidateCache } from "@/lib/cache";
import { handleError } from "@/lib/http";

const MAX_SOUL_LENGTH = 40_000;

const soulCacheKey = (orgId: string) => `soul:${orgId}`;
const SOUL_CACHE_TTL_MS = 30_000;

export function registerSoulRoutes(app: FastifyInstance): void {
  app.get("/api/soul", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    try {
      const db = await getDb();
      const org = await ensureDefaultOrganization(db);
      const soul = await cached(soulCacheKey(org.id), SOUL_CACHE_TTL_MS, () =>
        getSoul(db, org.id)
      );
      return reply.send({
        soul: {
          content: soul.content,
          fallbackReply: soul.fallbackReply,
          version: soul.version,
        },
      });
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  });

  app.put("/api/soul", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const content = typeof body?.content === "string" ? body.content.trim() : "";
      if (!content) {
        return reply.code(400).send({ error: "Soul content is required" });
      }
      if (content.length > MAX_SOUL_LENGTH) {
        return reply.code(400).send({
          error: `Soul content must be under ${MAX_SOUL_LENGTH} characters`,
        });
      }
      const fallbackReply =
        typeof body?.fallbackReply === "string"
          ? body.fallbackReply.trim()
          : undefined;
      if (fallbackReply && fallbackReply.length > 1000) {
        return reply
          .code(400)
          .send({ error: "Fallback reply must be under 1000 characters" });
      }

      const db = await getDb();
      const org = await ensureDefaultOrganization(db);
      const soul = await updateSoul(db, org.id, content, fallbackReply);

      invalidateCache(soulCacheKey(org.id));

      return reply.send({
        soul: {
          content: soul.content,
          fallbackReply: soul.fallbackReply,
          version: soul.version,
        },
      });
    } catch (err) {
      return reply.code(500).send({
        error: `Something went wrong. Please try again. (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  });
}