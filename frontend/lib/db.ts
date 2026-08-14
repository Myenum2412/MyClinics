import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
  },
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 60_000,
  waitQueueTimeoutMS: 30_000,
  serverSelectionTimeoutMS: 30_000,
  connectTimeoutMS: 30_000,
  socketTimeoutMS: 120_000,
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  // Deferred error: module import must never throw (Next.js evaluates server
  // module graphs at build time), so surface a clear message on first use.
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
