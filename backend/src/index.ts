import "./scripts/bootstrap-env";
import { buildServer } from "@/app";
import { getDb } from "@/lib/db";
import { ensureIndexes } from "@/lib/indexes";
import { ensureClinicIndexes } from "@/clinic/indexes";
import { ensurePlatformAdmin } from "@/clinic/seed";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { syncCronJobs } from "@/services/cronjob/cronjob.service";
import { logger } from "@/lib/logger";

const PORT = Number(process.env.BACKEND_PORT ?? 3100);
const HOST = process.env.BACKEND_HOST ?? "0.0.0.0";

async function main() {
  let db;
  try {
    db = await getDb();
    await ensureIndexes(db);
    await ensureClinicIndexes(db);
    await ensurePlatformAdmin(db);
    await ensureDefaultOrganization(db);
    logger.info("Database initialization complete");
  } catch (error) {
    logger.error("Failed to initialize database", { error });
    process.exit(1);
  }

  const app = buildServer();

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);
    try {
      await app.close();
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

  void syncCronJobs()
    .then((result) =>
      logger.info(`[cron-job.org] scheduler job ${result.action}`, {
        jobId: result.jobId ?? "n/a",
      })
    )
    .catch((error) =>
      logger.error("[cron-job.org] scheduler sync failed", { error })
    );
}

main().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});