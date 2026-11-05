// API benchmark harness for MyClinics performance testing.
// Usage: node tools/bench.mjs <clinicId> [runs]
// Logs in as platform admin and times the main clinic list endpoints.
const BASE = process.env.BENCH_BASE || "http://localhost:3100";
const ADMIN_EMAIL = process.env.BENCH_EMAIL || "developer@myenum.in";
const ADMIN_PASSWORD = process.env.BENCH_PASSWORD || "devpass123";

const clinicId = process.argv[2];
const runs = Number(process.argv[3] || 5);

if (!clinicId) {
  console.error("usage: node tools/bench.mjs <clinicId> [runs]");
  process.exit(1);
}

async function login() {
  const res = await fetch(`${BASE}/api/clinics/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}`);
  const json = await res.json();
  return json.token;
}

const endpoints = [
  ["GET", "/api/clinics/auth/me"],
  ["GET", `/api/clinics/${clinicId}/dashboard`],
  ["GET", `/api/clinics/${clinicId}/appointments?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/appointments?page=1&pageSize=20&q=a`],
  ["GET", `/api/clinics/${clinicId}/appointments/queue`],
  ["GET", `/api/clinics/${clinicId}/appointments/stats`],
  ["GET", `/api/clinics/${clinicId}/patients?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/patients?page=1&pageSize=20&q=a`],
  ["GET", `/api/clinics/${clinicId}/patients/stats`],
  ["GET", `/api/clinics/${clinicId}/doctors?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/billing?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/billing?page=1&pageSize=20&q=a`],
  ["GET", `/api/clinics/${clinicId}/prescriptions?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/prescriptions?page=1&pageSize=20&q=a`],
  ["GET", `/api/clinics/${clinicId}/medicine?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/investigations?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/examinations?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/labs?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/leads?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/leads/stats`],
  ["GET", `/api/clinics/${clinicId}/notifications?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/audit-logs?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/medical-record/folders`],
  ["GET", `/api/clinics/${clinicId}/medical-record/files?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/inventory?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/medicines?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/sales?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/purchases?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/suppliers?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/movements?page=1&pageSize=20`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/dashboard`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/alerts`],
  ["GET", `/api/clinics/${clinicId}/pharmacy/reports?type=stock`,
  ],
  ["GET", `/api/clinics/${clinicId}/search?q=a&types=patient,doctor`],
];

function pct(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

const token = await login();
const results = [];
for (const [method, path] of endpoints) {
  const times = [];
  let status = 0;
  let size = 0;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { authorization: `Bearer ${token}` },
      });
      const buf = await res.arrayBuffer();
      const dt = performance.now() - t0;
      times.push(dt);
      status = res.status;
      size = buf.byteLength;
    } catch (e) {
      times.push(performance.now() - t0);
      status = -1;
    }
  }
  results.push({
    path: path.replace(clinicId, "<clinic>"),
    status,
    size,
    p50: Math.round(pct(times, 50)),
    p95: Math.round(pct(times, 95)),
    min: Math.round(Math.min(...times)),
  });
}

results.sort((a, b) => b.p50 - a.p50);
console.log(
  "p50(ms)  p95(ms)  min(ms)   bytes  status  path"
);
for (const r of results) {
  console.log(
    String(r.p50).padStart(7),
    String(r.p95).padStart(7),
    String(r.min).padStart(7),
    String(r.size).padStart(8),
    String(r.status).padStart(6),
    " " + r.path
  );
}
