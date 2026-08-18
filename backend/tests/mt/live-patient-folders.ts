// Live E2E for patient folders: seeds local mongod, boots the backend,
// mints a session JWE, and exercises /api/patient-folders + R2 verification.
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import { EncryptJWT } from "jose";
import { hkdf } from "@panva/hkdf";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27099/myclinic";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-secret-at-least-16-chars";
const PORT = 3199;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const random = new ObjectId().toString().slice(-6);
  const mobile = `99${random}${random.slice(0, 4)}`;

  const patientId = new ObjectId();
  const seed = {
    patients: [
      {
        _id: patientId,
        fullName: `E2E Patient ${random}`,
        mobile,
        email: `e2e${random}@example.com`,
        age: 42,
        gender: "male",
        createdAt: new Date(),
      },
    ],
    appointments: [
      {
        _id: new ObjectId(),
        fullName: `E2E Patient ${random}`,
        mobile,
        date: "2026-08-10",
        time: "10:30 AM",
        type: "in-person",
        reason: "Fever checkup",
        status: "completed",
        doctorName: "Dr. Test",
        createdAt: new Date(),
      },
    ],
    prescriptions: [
      {
        _id: new ObjectId(),
        patientName: `E2E Patient ${random}`,
        phone: mobile,
        visitDate: "2026-08-10",
        diagnosis: "Viral fever",
        medicines: [
          { name: "Paracetamol", dosage: "500mg", frequency: "1-0-1", duration: "5 days", beforeAfterFood: "After food" },
          { name: "Cetirizine", dosage: "10mg", frequency: "0-0-1", duration: "3 days", beforeAfterFood: "After food" },
        ],
        doctorName: "Dr. Test",
        createdAt: new Date(),
      },
    ],
    bills: [
      {
        _id: new ObjectId(),
        billNumber: `INV-E2E-${random}`,
        patientName: `E2E Patient ${random}`,
        patientPhone: mobile,
        date: "2026-08-10",
        total: 750,
        status: "paid",
        paymentMethod: "cash",
        createdAt: new Date(),
      },
    ],
    reports: [
      {
        _id: new ObjectId(),
        name: `blood-report-${random}.pdf`,
        key: `reports/patients/${patientId.toString()}/Reports/${random}-blood-report.pdf`,
        size: 12345,
        type: "application/pdf",
        extension: "pdf",
        category: "upload",
        patientId,
        patientName: `E2E Patient ${random}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
  await db.collection("patients").deleteMany({ fullName: { $regex: "^E2E Patient" } });
  await db.collection("patients").insertMany(seed.patients);
  await db.collection("appointments").insertMany(seed.appointments);
  await db.collection("prescriptions").insertMany(seed.prescriptions);
  await db.collection("bills").insertMany(seed.bills);
  await db.collection("reports").insertMany(seed.reports);
  console.log(`seeded patient ${patientId.toString()} (${seed.patients[0].fullName})`);

  const key = await hkdf("sha256", AUTH_SECRET, "authjs.session-token", "Auth.js Generated Encryption Key (authjs.session-token)", 64);
  const token = await new EncryptJWT({
    sub: "doctor-e2e",
    role: "doctor",
    name: "Dr. Test",
    email: "doctor@test.local",
  })
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .encrypt(key);
  const cookie = `authjs.session-token=${encodeURIComponent(token)}`;

  const server = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BACKEND_PORT: String(PORT),
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let booted = false;
  server.stdout.on("data", (d) => {
    const s = String(d);
    if (s.includes("listening")) booted = true;
    process.stdout.write(`[server] ${s}`);
  });
  server.stderr.on("data", (d) => process.stdout.write(`[server-err] ${String(d)}`));
  const deadline = Date.now() + 30000;
  while (!booted && Date.now() < deadline) await sleep(500);
  if (!booted) throw new Error("backend did not boot in time");

  const base = `http://127.0.0.1:${PORT}`;
  const get = async (path: string) => {
    const res = await fetch(`${base}${path}`, { headers: { cookie } });
    const body: any = await res.json();
    console.log(`GET ${path} -> ${res.status}`);
    return { status: res.status, body };
  };

  const index = await get("/api/patient-folders");
  const entry = index.body.patients?.find((p: any) => p.id === patientId.toString());
  if (!entry) throw new Error("seeded patient missing from folder index");
  console.log("  counts:", JSON.stringify(entry.folders));
  if (entry.folders.appointments !== 1) throw new Error("appointments count wrong");
  if (entry.folders.prescriptions !== 1) throw new Error("prescriptions count wrong");
  if (entry.folders.medicines !== 2) throw new Error("medicines count wrong");
  if (entry.folders.billing !== 1) throw new Error("billing count wrong");
  if (entry.folders.reports !== 1) throw new Error("reports count wrong");
  console.log("  index counts OK");

  const appts = await get(`/api/patient-folders/${patientId.toString()}/appointments`);
  if (appts.body.items?.length !== 1) throw new Error("appointments folder wrong");

  const meds = await get(`/api/patient-folders/${patientId.toString()}/medicines`);
  if (meds.body.items?.length !== 2) throw new Error("medicines folder wrong");
  console.log("  medicines:", meds.body.items.map((m: any) => m.name).join(", "));

  const bills = await get(`/api/patient-folders/${patientId.toString()}/billing`);
  if (bills.body.items?.[0]?.billNumber !== `INV-E2E-${random}`) throw new Error("billing folder wrong");

  const prof = await get(`/api/patient-folders/${patientId.toString()}/patients`);
  if (prof.body.items?.[0]?.fullName !== seed.patients[0].fullName) throw new Error("patients folder wrong");

  const reps = await get(`/api/patient-folders/${patientId.toString()}/reports`);
  if (reps.body.items?.length !== 1 || reps.body.items[0].key !== undefined) throw new Error("reports folder wrong");
  console.log("  reports item has key stripped:", reps.body.items[0].key === undefined);

  // Real multipart upload → must be stored under the patient's R2 folder.
  const form = new FormData();
  form.append("name", `e2e-upload-${random}.pdf`);
  form.append("category", "upload");
  form.append("patientId", patientId.toString());
  form.append("patientName", seed.patients[0].fullName);
  form.append(
    "file",
    new Blob([Buffer.from("%PDF-1.4 e2e test")], { type: "application/pdf" }),
    `e2e-upload-${random}.pdf`
  );
  const upload = await fetch(`${base}/api/reports`, {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  const uploadBody: any = await upload.json();
  console.log("POST /api/reports ->", upload.status);
  if (upload.status !== 201) throw new Error(`upload failed: ${JSON.stringify(uploadBody)}`);
  const uploadedKey = uploadBody.file?.key as string;
  console.log("  stored key:", uploadedKey);
  if (!uploadedKey.startsWith(`reports/patients/${patientId.toString()}/`)) {
    throw new Error("upload not stored under patient folder");
  }
  const del = await fetch(`${base}/api/reports/${uploadBody.file.id}`, {
    method: "DELETE",
    headers: { cookie },
  });
  console.log("DELETE /api/reports/:id ->", del.status);
  if (del.status !== 200) throw new Error("cleanup delete failed");

  const bad = await get(`/api/patient-folders/${patientId.toString()}/bogus`);
  if (bad.status !== 400) throw new Error("unknown folder should 400");

  const missing = await get(`/api/patient-folders/${new ObjectId().toString()}/billing`);
  if (missing.status !== 404) throw new Error("missing patient should 404");

  const noAuth = await fetch(`${base}/api/patient-folders`);
  if (noAuth.status !== 401) throw new Error("no-auth should 401");

  // R2 verification: folders physically exist with markers.
  const r2 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });
  const listed = await r2.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!,
      Prefix: `reports/patients/${patientId.toString()}/`,
    })
  );
  const keys = (listed.Contents ?? []).map((o) => o.Key);
  console.log("R2 keys under patient folder:");
  for (const k of keys) console.log("  ", k);
  for (const folder of ["Appointments", "Patients", "Prescriptions", "Medicines", "Billing"]) {
    if (!keys.includes(`reports/patients/${patientId.toString()}/${folder}/.folder`)) {
      throw new Error(`R2 folder marker missing: ${folder}`);
    }
  }
  console.log("R2 folder structure OK");

  server.kill("SIGTERM");
  await sleep(1500);
  await client.close();
  console.log("E2E PASSED");
  process.exit(0);
}

main().catch((e) => {
  console.error("E2E FAILED:", e.message ?? e);
  process.exit(1);
});