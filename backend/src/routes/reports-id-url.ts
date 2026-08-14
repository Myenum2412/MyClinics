import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getDownloadUrl } from "@/lib/r2";
import { handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

export function registerReportUrlRoutes(app: FastifyInstance): void {
  app.get("/api/reports/:id/url", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid report id" });
      }

      const db = await getDb();
      const doc = await db.collection("reports").findOne({ _id: new ObjectId(id) });
      if (!doc || !doc.key) {
        return reply.code(404).send({ error: "Report not found" });
      }

      const url = await getDownloadUrl(doc.key);
      return reply.send({ url });
    } catch (error) {
      handleError(reply, error, "Get report url");
    }
  });
}