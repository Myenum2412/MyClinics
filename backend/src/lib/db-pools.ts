import { MongoClient, Db, ServerApiVersion } from "mongodb";

interface PoolConfig {
  name: string;
  maxPoolSize: number;
  minPoolSize: number;
}

const POOL_CONFIGS: Record<string, PoolConfig> = {
  // Main API pool - handles most requests
  default: { name: "default", maxPoolSize: 50, minPoolSize: 5 },
  // Medical records - heavy read/write, needs dedicated pool
  medicalRecords: { name: "medicalRecords", maxPoolSize: 30, minPoolSize: 3 },
  // Appointments - high frequency, needs dedicated pool
  appointments: { name: "appointments", maxPoolSize: 30, minPoolSize: 3 },
  // WhatsApp worker - long-running, separate pool
  whatsapp: { name: "whatsapp", maxPoolSize: 20, minPoolSize: 2 },
  // Cron jobs - burst traffic, small pool
  cron: { name: "cron", maxPoolSize: 10, minPoolSize: 1 },
  // AI services - occasional heavy queries
  ai: { name: "ai", maxPoolSize: 15, minPoolSize: 2 },
};

const BASE_OPTIONS = {
  serverApi: { version: ServerApiVersion.v1 },
  // Keep connections alive for 5 minutes so the cron pool (fired every minute)
  // doesn't reconnect on every tick. The previous 60 s idle timeout matched
  // the cron interval almost exactly, creating a race that killed the connection
  // just before the next ping hit it.
  maxIdleTimeMS: 300_000,
  waitQueueTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 60_000,
};

class PoolManager {
  private pools = new Map<string, { client: MongoClient; db: Db; promise: Promise<MongoClient> }>();
  private initializing = new Set<string>();

  async getPool(poolName: keyof typeof POOL_CONFIGS = "default"): Promise<Db> {
    const config = POOL_CONFIGS[poolName] ?? POOL_CONFIGS.default;

    if (this.pools.has(poolName)) {
      // Return the cached pool directly. The MongoDB driver manages internal
      // connection health and will transparently reconnect on the next
      // operation if a socket was dropped. Pinging on every getPool() call
      // added a full round-trip to every request and triggered unnecessary
      // reconnects when the idle timeout raced with the cron interval.
      return this.pools.get(poolName)!.db;
    }

    if (this.initializing.has(poolName)) {
      // Wait for existing initialization
      while (this.initializing.has(poolName)) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return this.getPool(poolName);
    }

    this.initializing.add(poolName);

    // Read the env var lazily: importing this module must never require
    // MONGODB_URI to be set (unit tests import the service layer with fake
    // DBs, and tooling may load it before dotenv has run). Mirrors the
    // deferred-error pattern used in lib/db.ts.
    const uri = process.env.MONGODB_URI ?? "";
    if (!uri) {
      this.initializing.delete(poolName);
      throw new Error("MONGODB_URI is required");
    }

    try {
      const client = new MongoClient(uri, {
        ...BASE_OPTIONS,
        maxPoolSize: config.maxPoolSize,
        minPoolSize: config.minPoolSize,
      });

      const connectPromise = client.connect();
      const db = client.db("myclinic");

      this.pools.set(poolName, { client, db, promise: connectPromise });
      await connectPromise;

      // Verify connection
      await db.command({ ping: 1 });

      return db;
    } finally {
      this.initializing.delete(poolName);
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.pools.values()).map(({ client }) => client.close())
    );
    this.pools.clear();
  }

  getPoolStats(): Record<string, { poolSize: number; available: number }> {
    const stats: Record<string, { poolSize: number; available: number }> = {};
    for (const [name, { client }] of this.pools) {
      // Access internal pool state (MongoDB driver 6.x)
      const pool = (client as any).s?.pool;
      if (pool) {
        stats[name] = {
          poolSize: pool.size ?? 0,
          available: pool.available ?? 0,
        };
      }
    }
    return stats;
  }
}

export const poolManager = new PoolManager();

export const DB_NAME = "myclinic";

/** Get the default database connection (backward compatible) */
export async function getDb(): Promise<Db> {
  return poolManager.getPool("default");
}

/** Get a named pool for specific service */
export async function getPoolDb(poolName: keyof typeof POOL_CONFIGS): Promise<Db> {
  return poolManager.getPool(poolName);
}

/** Get pool statistics for monitoring */
export function getPoolStats() {
  return poolManager.getPoolStats();
}

/** Close all pools (for graceful shutdown) */
export async function closeAllPools() {
  await poolManager.closeAll();
}

// Named pool getters for convenience
export const getMedicalRecordsDb = () => getPoolDb("medicalRecords");
export const getAppointmentsDb = () => getPoolDb("appointments");
export const getWhatsAppDb = () => getPoolDb("whatsapp");
export const getCronDb = () => getPoolDb("cron");
export const getAIDb = () => getPoolDb("ai");

export default poolManager;