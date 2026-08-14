import "./scripts/bootstrap-env";
import { buildServer } from "@/app";
import { getDb } from "@/lib/db";
import { ensureIndexes } from "@/lib/indexes";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";

const PORT = Number(process.env.BACKEND_PORT ?? 3100);
const HOST = process.env.BACKEND_HOST ?? "0.0.0.0";

async function main() {
  const db = await getDb();
  await ensureIndexes(db);
  await ensureDefaultOrganization(db);

  const app = buildServer();

  const shutdown = async (signal: string) => {
    console.log(`[server] ${signal} received, shutting down`);
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: PORT, host: HOST });
  console.log(`[server] API server listening on http://${HOST}:${PORT}`);
}

main().catch((error) => {
  console.error("[server] Failed to start", error);
  process.exit(1);
});