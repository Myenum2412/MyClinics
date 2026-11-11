import { MongoClient, Db } from "mongodb";

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017";
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_LOCAL_URI;
export const DB_NAME = "myclinic";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  // Primary connection attempt
  const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  };

  try {
    if (!cachedClient) {
      if (process.env.NODE_ENV === "development") {
        if (!global._mongoClientPromise) {
          const client = new MongoClient(MONGODB_URI, options);
          global._mongoClientPromise = client.connect();
        }
        cachedClient = await global._mongoClientPromise;
      } else {
        const client = new MongoClient(MONGODB_URI, options);
        cachedClient = await client.connect();
      }
    }
    cachedDb = cachedClient.db(DB_NAME);
    return cachedDb;
  } catch {
    // If primary URI fails (e.g. Atlas offline), fallback to local mongo container
    try {
      const fallbackClient = new MongoClient(DEFAULT_LOCAL_URI, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      cachedClient = await fallbackClient.connect();
      cachedDb = cachedClient.db(DB_NAME);
      return cachedDb;
    } catch (fallbackError) {
      throw new Error(`Failed to connect to MongoDB: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
    }
  }
}
