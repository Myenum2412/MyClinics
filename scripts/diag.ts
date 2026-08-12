import "./bootstrap-env";
import { getDb } from "@/lib/db";

async function main() {
  const db = await getDb();
  const now = new Date();
  console.log("now:", now.toISOString());

  for (const coll of ["conversations", "customers", "organizations"]) {
    const count = await db.collection(coll).countDocuments();
    console.log(`collection ${coll}: ${count} docs`);
  }

  const last = await db
    .collection("conversations")
    .find({})
    .sort({ timestamp: -1 })
    .limit(6)
    .toArray();
  console.log("--- last conversations ---");
  for (const c of last) {
    console.log(
      `[${new Date(c.timestamp).toISOString()}] direction=${c.direction} intent=${c.intent} msg=${JSON.stringify(String(c.message).slice(0, 60))}`
    );
  }

  const orgs = await db.collection("organizations").find({}).limit(5).toArray();
  console.log("--- organizations ---");
  for (const o of orgs) {
    console.log(`id=${o._id} name=${o.name} whatsappNumber=${JSON.stringify(o.whatsappNumber)}`);
  }
}

main()
  .catch((err) => console.error("FAILED", err instanceof Error ? err.message : String(err)))
  .finally(() => process.exit(0));
