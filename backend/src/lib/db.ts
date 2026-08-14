import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
  },
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE ?? 50),
  minPoolSize: 5,
  maxIdleTimeMS: 60_000,
  waitQueueTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 60_000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  // Deferred error: module import must never throw (tests and build tools
  // import this module without a live MONGODB_URI), so surface a clear
  // message on first use.
  clientPromise = Promise.reject(
    new Error("Please define MONGODB_URI in .env.local")
  );
  clientPromise.catch(() => {});
} else if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export const DB_NAME = "myclinic";

export async function getDb() {
  const conn = await clientPromise;
  return conn.db(DB_NAME);
}

export default clientPromise;