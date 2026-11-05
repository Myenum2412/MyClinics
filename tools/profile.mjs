// Profile-driven query analysis: hits the perf clinic's list endpoints while
// MongoDB's profiler is enabled, then aggregates per-collection query cost.
// Usage: node tools/profile.mjs [clinicId]
import { MongoClient } from "mongodb";

const BASE = process.env.BENCH_BASE || "http://localhost:3100";
const CLINIC_ID = process.argv[2] || "clc_PERFTEST0000000000";
const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DBNAME = process.env.MONGODB_DB || "myclinic";

const client = new MongoClient(URI);
await client.connect();
const db = client.db(DBNAME);

async function login() {
  const res = await fetch(`${BASE}/api/clinics/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "perf-admin@clinic.test", password: "devpass123" }),
  });
  const j = await res.json();
  if (!j.token) throw new Error("login failed: " + JSON.stringify(j));
  return j.token;
}

const token = await login();
const paths = [
  ["dashboard", `/api/clinics/${CLINIC_ID}/dashboard`],
  ["appointments.list", `/api/clinics/${CLINIC_ID}/appointments?page=1&pageSize=20`],
  ["appointments.search", `/api/clinics/${CLINIC_ID}/appointments?page=1&pageSize=20&q=a`],
  ["appointments.queue", `/api/clinics/${CLINIC_ID}/appointments/queue`],
  ["appointments.stats", `/api/clinics/${CLINIC_ID}/appointments/stats`],
  ["patients.list", `/api/clinics/${CLINIC_ID}/patients?page=1&pageSize=20`],
  ["patients.search", `/api/clinics/${CLINIC_ID}/patients?page=1&pageSize=20&q=asha`],
  ["patients.stats", `/api/clinics/${CLINIC_ID}/patients/stats`],
  ["doctors.list", `/api/clinics/${CLINIC_ID}/doctors?page=1&pageSize=20`],
  ["billing.list", `/api/clinics/${CLINIC_ID}/billing?page=1&pageSize=20`],
  ["billing.search", `/api/clinics/${CLINIC_ID}/billing?page=1&pageSize=20&q=a`],
  ["prescriptions.list", `/api/clinics/${CLINIC_ID}/prescriptions?page=1&pageSize=20`],
  ["medicine.list", `/api/clinics/${CLINIC_ID}/medicine?page=1&pageSize=20`],
  ["investigations.list", `/api/clinics/${CLINIC_ID}/investigations?page=1&pageSize=20`],
  ["examinations.list", `/api/clinics/${CLINIC_ID}/examinations?page=1&pageSize=20`],
  ["labs.list", `/api/clinics/${CLINIC_ID}/labs?page=1&pageSize=20`],
  ["leads.list", `/api/clinics/${CLINIC_ID}/leads?page=1&pageSize=20`],
  ["leads.workflow", `/api/clinics/${CLINIC_ID}/leads/stats/workflow`],
  ["notifications.list", `/api/clinics/${CLINIC_ID}/notifications?page=1&pageSize=20`],
  ["audit.list", `/api/clinics/${CLINIC_ID}/audit-logs?page=1&pageSize=20`],
  ["medrec.list", `/api/clinics/${CLINIC_ID}/medical-record?page=1&pageSize=20`],
  ["medrec.folders", `/api/clinics/${CLINIC_ID}/medical-record/folders`],
  ["pharmacy.inventory", `/api/clinics/${CLINIC_ID}/pharmacy/inventory?page=1&pageSize=20`],
  ["pharmacy.medicines", `/api/clinics/${CLINIC_ID}/pharmacy/medicines?page=1&pageSize=20`],
  ["pharmacy.sales", `/api/clinics/${CLINIC_ID}/pharmacy/sales?page=1&pageSize=20`],
  ["pharmacy.purchases", `/api/clinics/${CLINIC_ID}/pharmacy/purchases?page=1&pageSize=20`],
  ["pharmacy.suppliers", `/api/clinics/${CLINIC_ID}/pharmacy/suppliers?page=1&pageSize=20`],
  ["pharmacy.movements", `/api/clinics/${CLINIC_ID}/pharmacy/movements?page=1&pageSize=20`],
  ["pharmacy.dashboard", `/api/clinics/${CLINIC_ID}/pharmacy/dashboard`],
  ["pharmacy.alerts", `/api/clinics/${CLINIC_ID}/pharmacy/alerts`],
];

await db.command({ profile: 0 });
await db.collection("system.profile").drop().catch(() => {});
await db.command({ profile: 2, slowms: 0 });

const endpointResults = [];
for (const [name, path] of paths) {
  const before = Date.now();
  const res = await fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${token}` } });
  const text = await res.text();
  endpointResults.push({
    name, status: res.status, bytes: text.length, ms: Date.now() - before,
    // unique marker so we can correlate profile entries via appName is not set;
    // we instead just time-window (local, sequential requests).
    t0: before, t1: Date.now(),
  });
}

await db.command({ profile: 0 });

const prof = await db.collection("system.profile").find({}).toArray();
// Correlate each profile entry to the request whose [t0,t1] window contains its ts.
function endpointFor(ts) {
  const t = ts.getTime();
  return endpointResults.find((e) => t >= e.t0 - 2 && t <= e.t1 + 2) || null;
}

console.log("\n=== ENDPOINT SUMMARY (local) ===");
console.log("ms".padStart(6), "bytes".padStart(7), "docsExamined".padStart(12), "keys".padStart(8), "collscan".padStart(9), " path");
const byEndpoint = new Map();
for (const p of prof) {
  if (p.op !== "query" && p.op !== "command") continue;
  const e = endpointFor(p.ts);
  if (!e) continue;
  const k = e.name;
  const s = byEndpoint.get(k) || { docs: 0, keys: 0, qms: 0, collscan: 0, n: 0 };
  s.docs += p.docsExamined ?? 0;
  s.keys += p.keysExamined ?? 0;
  s.qms += p.millis ?? 0;
  s.n += 1;
  if (p.planSummary === "COLLSCAN") s.collscan += 1;
  byEndpoint.set(k, s);
}
const summary = endpointResults.map((e) => {
  const s = byEndpoint.get(e.name) || { docs: 0, keys: 0, qms: 0, collscan: 0, n: 0 };
  return { ...e, ...s };
});
summary.sort((a, b) => b.docs - a.docs);
for (const s of summary) {
  console.log(
    String(s.ms).padStart(6),
    String(s.bytes).padStart(7),
    String(s.docs).padStart(12),
    String(s.keys).padStart(8),
    String(s.collscan).padStart(9),
    ` ${s.name} [${s.status}] (${s.n} db ops)`
  );
}

// Only failed endpoints (403/404) — mark clearly
for (const s of summary) if (s.status >= 400) console.log("  FAILED:", s.name, s.status);

await client.close();
