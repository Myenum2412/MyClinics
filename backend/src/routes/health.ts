import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db-pools";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/health/db", async () => {
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      return { status: "ok", database: "connected", timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: "error", database: "disconnected", timestamp: new Date().toISOString() };
    }
  });
}