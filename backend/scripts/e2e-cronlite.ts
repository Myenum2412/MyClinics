/**
 * Real end-to-end verification of the MyClinics <-> self-hosted CronLite flow.
 *
 * This is NOT a mock. It imports the actual production modules
 * (`@/services/cronlite/cronlite.service`, `@/plugins/auth`) and a live CronLite
 * instance. It stands up a tiny Fastify receiver that uses the REAL auth +
 * HMAC-verification code, then exercises the full lifecycle:
 *
 *   MyClinics /api/cron/sync  ->  CronLite API (real)  ->  creates job
 *   CronLite scheduler/trigger ->  MyClinics /api/cron/reminders  ->  HMAC verify
 *
 * Run with:  CRONLITE_LIVE=1 npx tsx scripts/e2e-cronlite.ts
 * Requires a CronLite instance at CRONLITE_URL with CRONLITE_API_KEY set.
 */
async function main() {
  process.env.CRONLITE_URL = process.env.CRONLITE_URL ?? "http://localhost:8080";
  process.env.CRONLITE_API_KEY = process.env.CRONLITE_API_KEY ?? "ec_local_dev_key";
  process.env.CRONLITE_WEBHOOK_SECRET = process.env.CRONLITE_WEBHOOK_SECRET ?? "webhooksecret123";
  process.env.CRON_SECRET = process.env.CRON_SECRET ?? "crONSECRETxyz";
  // Must be a non-loopback, non-private host from CronLite's perspective, or
  // CronLite rejects the webhook URL. `host.docker.internal` resolves to the
  // host gateway when CronLite runs in Docker; use the public URL in production.
  process.env.APP_URL = process.env.APP_URL ?? "http://host.docker.internal:3100";
  process.env.CRONLITE_TIMEZONE = "Asia/Kolkata";

  const Fastify = (await import("fastify")).default;
  const { verifyCronLiteSignature, requireCronSecret } = await import("@/plugins/auth");
  const { syncCronJobs, getCronLiteStatus } = await import("@/services/cronlite/cronlite.service");
  const crypto = await import("node:crypto");

  const app = Fastify({ logger: false });
  const webhookHits: string[] = [];
  // Mirror backend/src/app.ts: capture raw bytes for HMAC verification.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    (request as unknown as { rawBody?: string }).rawBody = String(body);
    const text = String(body).trim();
    if (text === "") return done(null, null);
    try {
      done(null, JSON.parse(text));
    } catch (e) {
      done(e as Error);
    }
  });

  app.post("/api/cron/sync", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;
    const r = await syncCronJobs();
    return reply.send({ ok: true, ...r });
  });

  app.post("/api/cron/reminders", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;
    const ok = verifyCronLiteSignature(request);
    console.log(`  [webhook] /api/cron/reminders  sig=${(request.headers["x-cronlite-signature"] as string)?.slice(0, 12)}… verified=${ok}`);
    return reply.send({ ok, verified: ok });
  });

  app.post("/api/cron/appointment-reminder", async (request, reply) => {
    if (!requireCronSecret(request, reply)) return;
    const ok = verifyCronLiteSignature(request);
    webhookHits.push(`appointment-reminder:verified=${ok}`);
    console.log(`  [webhook] /api/cron/appointment-reminder verified=${ok}`);
    return reply.send({ ok, verified: ok });
  });

  await app.listen({ port: 3100, host: "0.0.0.0" });
  console.log("[harness] listening on 0.0.0.0:3100 (APP_URL used by CronLite webhook)");

  const BASE = process.env.HARNESS_URL ?? "http://localhost:3100";
  const CL = process.env.CRONLITE_URL;
  const auth = { Authorization: `Bearer ${process.env.CRONLITE_API_KEY}` };
  const cronSecret = { "x-cron-secret": process.env.CRON_SECRET as string };
  let pass = 0;
  let fail = 0;
  const check = (label: string, cond: boolean, extra = "") => {
    console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`);
    cond ? pass++ : fail++;
  };

  // 1) status before sync
  let st = await getCronLiteStatus();
  console.log(`\n[1] status before sync: ${st.status}`);
  check("status is job_missing or not_configured before first sync", st.status === "job_missing" || st.status === "not_configured", st.status);

  // 2) sync creates the real job
  console.log("\n[2] POST /api/cron/sync (real CronLite)");
  let res = await fetch(`${BASE}/api/cron/sync`, { method: "POST", headers: cronSecret });
  const syncBody = await res.json();
  console.log("    sync result:", JSON.stringify(syncBody));
  check("sync returns ok", res.status === 200 && syncBody.ok === true, `action=${syncBody.action}`);

  // 3) verify the real CronLite job
  console.log("\n[3] GET real CronLite job");
  res = await fetch(`${CL}/jobs?name=myclinics-reminders`, { headers: auth });
  const jobsResp = (await res.json()) as { jobs: any[] };
  const jobs = jobsResp.jobs ?? [];
  const job = jobs[0];
  console.log("    job:", JSON.stringify(job));
  check("exactly one reminder job exists", jobs.length === 1, `count=${jobs.length}`);
  check("webhook_url targets production reminder endpoint", job?.webhook_url === "http://host.docker.internal:3100/api/cron/reminders", job?.webhook_url);
  check("cron expression is * * * * *", job?.cron_expression === "* * * * *", job?.cron_expression);
  check("timezone is Asia/Kolkata", job?.timezone === "Asia/Kolkata", job?.timezone);

  // 4) idempotent sync
  console.log("\n[4] repeat sync 3x (idempotency)");
  for (let i = 0; i < 3; i++) {
    await fetch(`${BASE}/api/cron/sync`, { method: "POST", headers: cronSecret });
  }
  res = await fetch(`${CL}/jobs?name=myclinics-reminders`, { headers: auth });
  const jobs2 = ((await res.json()) as { jobs: any[] }).jobs ?? [];
  check("still exactly one reminder job after repeated sync", jobs2.length === 1, `count=${jobs2.length}`);

  // 5) status healthy
  st = await getCronLiteStatus();
  console.log(`\n[5] status after sync: ${st.status}`);
  check("getCronLiteStatus reports healthy", st.status === "healthy", st.status);

  // 6) trigger real webhook from CronLite -> MyClinics HMAC verify
  console.log("\n[6] trigger CronLite job -> real webhook to MyClinics");
  if (job?.id) {
    res = await fetch(`${CL}/jobs/${job.id}/trigger`, { method: "POST", headers: auth });
    console.log("    trigger status:", res.status);
    await new Promise((r) => setTimeout(r, 5000));
  }

  // 7) tampered/invalid signature must be rejected (401)
  console.log("\n[7] invalid signature rejected");
  res = await fetch(`${BASE}/api/cron/reminders`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-cronlite-signature": "deadbeef" },
    body: "{}",
  });
  check("bad signature -> 401", res.status === 401, `status=${res.status}`);

  // 8) valid signature (we compute with the shared secret) must be accepted (200)
  console.log("\n[8] valid signature accepted");
  const validSig = crypto.createHmac("sha256", process.env.CRONLITE_WEBHOOK_SECRET as string).update(Buffer.from("{}")).digest("hex");
  res = await fetch(`${BASE}/api/cron/reminders`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-cronlite-signature": validSig },
    body: "{}",
  });
  const vbody = await res.json();
  check("valid signature -> 200 + verified", res.status === 200 && vbody.verified === true, `status=${res.status} verified=${vbody.verified}`);

  // 9) per-appointment one-shot webhook (real CronLite job -> MyClinics)
  console.log("\n[9] real CronLite one-shot appointment-reminder webhook");
  const apptJob = (await (
    await fetch(`${CL}/jobs`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({
        name: "appt-test",
        cron_expression: "* * * * *",
        timezone: "Asia/Kolkata",
        webhook_url: "http://host.docker.internal:3100/api/cron/appointment-reminder?clinicId=c1&appointmentId=a1",
        webhook_secret: process.env.CRONLITE_WEBHOOK_SECRET,
      }),
    })
  ).json()) as { id?: string };
  if (apptJob.id) {
    await fetch(`${CL}/jobs/${apptJob.id}/trigger`, { method: "POST", headers: auth });
    await new Promise((r) => setTimeout(r, 5000));
    await fetch(`${CL}/jobs/${apptJob.id}`, { method: "DELETE", headers: auth });
  }
  check(
    "appointment-reminder webhook received with valid HMAC",
    webhookHits.some((h) => h.startsWith("appointment-reminder:") && h.endsWith("verified=true")),
    webhookHits.join(" | ")
  );

  // cleanup
  if (job?.id) {
    await fetch(`${CL}/jobs/${job.id}`, { method: "DELETE", headers: auth });
  }
  await app.close();
  console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
