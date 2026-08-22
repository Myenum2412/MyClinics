import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("myclinic");

  const collections = [
    "clc_medical_record_files",
    "clc_medical_record_folders",
    "clc_appointment_notifications",
    "clc_audit_logs",
    "clc_patients",
  ];

  for (const collName of collections) {
    const coll = db.collection(collName);
    const indexes = await coll.indexes();
    console.log(`\n=== ${collName} ===`);
    indexes.forEach((idx) => {
      console.log(
        `  ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? " (UNIQUE)" : ""}${idx.background ? " [background]" : ""}`
      );
    });
  }

  await client.close();
}

main().catch(console.error);