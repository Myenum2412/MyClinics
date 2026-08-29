import dns from "node:dns";
import { MongoClient, Db, ServerApiVersion } from "mongodb";

// The host's systemd-resolved stub (127.0.0.53) intermittently fails the DNS
// SRV/TXT lookups that `mongodb+srv://` performs to discover Atlas cluster
// nodes. When that blips, the driver loses topology, gets stuck re-connecting
// to a stale cached node IP, and every connection times out — which silently
// kills the reminder/notification pipeline. Resolve via public DNS that
// reliably answers Atlas SRV queries instead.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  /* non-fatal: fall back to the system resolver */
}

interface PoolConfig {
  name: string;
  maxPoolSize: number;
  minPoolSize: number;
}

const POOL_CONFIGS: Record<string, PoolConfig> = {
  // Main API pool - handles most requests
  default: { name: "default", maxPoolSize: 12, minPoolSize: 0 },
  // Medical records - heavy read/write, needs dedicated pool
  medicalRecords: { name: "medicalRecords", maxPoolSize: 8, minPoolSize: 0 },
  // Appointments - high frequency, needs dedicated pool
  appointments: { name: "appointments", maxPoolSize: 8, minPoolSize: 0 },
  // WhatsApp worker - long-running, separate pool
  whatsapp: { name: "whatsapp", maxPoolSize: 8, minPoolSize: 0 },
  // Cron jobs - burst traffic, small pool
  cron: { name: "cron", maxPoolSize: 5, minPoolSize: 0 },
  // AI services - occasional heavy queries
  ai: { name: "ai", maxPoolSize: 6, minPoolSize: 0 },
};

const BASE_OPTIONS = {
  serverApi: { version: ServerApiVersion.v1 },
  // Connections are recycled well below the ~180 s idle-drop threshold of the
  // network path between this host and Atlas. The previous 300 s idle timeout
  // let pooled connections age past the drop window and go silently dead, after
  // which every operation hung until it timed out. With minPoolSize 0 and a 60 s
  // idle cap, connections are always fresh and the driver transparently
  // re-establishes them on the next use.
  maxIdleTimeMS: 60_000,
  waitQueueTimeoutMS: 15_000,
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 15_000,
  // Keep this low: the network path between this host and Atlas is flaky and
  // silently drops idle/dead sockets. A long socket timeout lets a wedged
  // connection hang a full operation before failing. 10s fails fast so the
  // worker's health-check can recycle the pool and retry on a fresh socket.
  socketTimeoutMS: 10_000,
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
      // Swallow client-level error events. The driver also surfaces connection
      // problems via operation rejections (which callers catch), but an
      // unhandled "error" event on the EventEmitter would otherwise crash the
      // whole process.
      client.on("error", () => {});

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