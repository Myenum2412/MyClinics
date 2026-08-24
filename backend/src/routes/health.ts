import type { FastifyInstance } from "fastify";
import { nowISO } from "@/clinic/core/datetime";
import { getDb } from "@/lib/db-pools";

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/health", async () => {
    return { status: "ok", timestamp: nowISO() };
  });

  app.get("/health/db", async () => {
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      return { status: "ok", database: "connected", timestamp: nowISO() };
    } catch (error) {
      return { status: "error", database: "disconnected", timestamp: nowISO() };
    }
  });
}