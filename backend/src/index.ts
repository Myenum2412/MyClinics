import "./scripts/bootstrap-env";
import { buildServer } from "@/app";
import { getDb, closeAllPools } from "@/lib/db-pools";
import { closeCache } from "@/lib/cache";
import { ensureIndexes } from "@/lib/indexes";
import { ensureClinicIndexes } from "@/clinic/indexes";
import { ensureSearchIndex } from "@/services/search/client";
import { ensureNeoIndexes } from "@/neo/core/neo-indexes";
import { startNeoEngine } from "@/neo/neo-engine";
import { ensurePlatformAdmin } from "@/clinic/seed";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { logger } from "@/lib/logger";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const PORT = Number(process.env.BACKEND_PORT ?? 3100);
const HOST = process.env.BACKEND_HOST ?? "0.0.0.0";

/**
 * Dev convenience: in non-production the API self-spawns the WhatsApp worker
 * as a child process so a single `npm run dev` brings up WhatsApp end-to-end
 * (no separate pm2 app required). In production the worker is expected to be
 * managed separately (pm2: myclinic-whatsapp); set WHATSAPP_WORKER_AUTO_START=false
 * to disable this behaviour in any environment.
 */
let whatsappWorker: ChildProcess | null = null;
function maybeStartWhatsappWorker(): void {
  if (process.env.NODE_ENV === "production") return;
  if (process.env.WHATSAPP_WORKER_AUTO_START === "false") return;
  const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const workerEntry = resolve(backendDir, "src/services/whatsapp/whatsapp.worker.ts");
  logger.info("Starting WhatsApp worker (dev) as a child process");
  whatsappWorker = spawn(process.execPath, ["--import", "tsx", workerEntry], {
    cwd: backendDir,
    stdio: "inherit",
    env: process.env,
  });
  whatsappWorker.on("error", (err) =>
    logger.error("WhatsApp worker failed to start", { error: err.message })
  );
  whatsappWorker.on("exit", (code, signal) =>
    logger.warn("WhatsApp worker exited", { code, signal })
  );
}

async function main() {
  let db;
  try {
    db = await getDb();
    await ensureIndexes(db);
    await ensureClinicIndexes(db);
    await ensureSearchIndex();
    await ensureNeoIndexes(db);
    await ensurePlatformAdmin(db);
    await ensureDefaultOrganization(db);
    logger.info("Database initialization complete");
  } catch (error) {
    logger.error("Failed to initialize database", { error });
    process.exit(1);
  }

  const app = buildServer();

  // Start the RGB Neo background engine (priority queue + incident processing).
  try {
    await startNeoEngine(db);
    logger.info("RGB Neo engine started");
  } catch (error) {
    logger.error("Failed to start RGB Neo engine", { error });
  }

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);
    try {
      await app.close();
      if (whatsappWorker && !whatsappWorker.killed) {
        whatsappWorker.kill("SIGTERM");
      }
      await closeAllPools();
      await closeCache();
      logger.info("Server closed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown", { error });
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
  });
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error });
    void shutdown("uncaughtException");
  });

  await app.listen({ port: PORT, host: HOST });
  logger.info(`API server listening on http://${HOST}:${PORT}`);

  // Bring up the WhatsApp worker (dev-only) after the API is listening.
  maybeStartWhatsappWorker();
}

main().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});