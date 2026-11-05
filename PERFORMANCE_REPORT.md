# MyClinics — Performance Report

**Date:** 2026-10-28
**Scope:** full stack — Next.js frontend, Fastify clinic API, MongoDB, pharmacy write path, auth.
**Method:** local production build + seeded database + MongoDB profiler + simulated WAN latency (not a code review only).

---

## 1. TL;DR

The code is fast on a LAN. The delay comes from **where the three tiers sit** and **how many round trips the code makes between them**:

```
Browser (India)
   │  ~0.4–1.5 s per API call
   ▼
Vercel  sin1 (Singapore)
   │
   ▼
EC2 API  13.239.83.200 (ap-southeast-2, Sydney)
   │  ~100 ms per MongoDB round trip
   ▼
MongoDB Atlas (Mumbai)
```

- A simple list endpoint is **4 ms locally** but **107 ms** with a 100 ms DB round trip.
- A 5-item pharmacy sale is **23 ms locally** but **4.09 s** on the real link (42 sequential DB operations).
- The medical-records screen fires **111 API requests** (101 of them are per-row avatar fetches) and takes **8.3 s** to finish loading with production-like latency.
- Login costs **257 ms of pure CPU** (bcrypt cost 12) before any network/DB work; a phone login can do up to 50 bcrypt compares (≈12.8 s worst case).

**Biggest wins:** move the API next to Atlas (Mumbai), remove the avatar N+1, batch pharmacy writes, and cache the per-request doctor lookup.

---

## 2. Test setup

| Component | Setup |
|---|---|
| Node | 24.21 |
| Backend | `tsx src/index.ts`, `NODE_ENV=development`, local MongoDB 7 |
| Frontend | Next.js 16.3 production build, `next start` |
| Database | fresh `myclinic` DB, seeded with 2,000 patients, 20,000 appointments, 6,000 bills, 5,000 prescriptions, 12 doctors, 500 medicines/inventory |
| Browser | Chromium 149 via Playwright, 1440×900 |
| DB profiling | MongoDB profiler level 2 (`system.profile`), one request per profile |
| WAN simulation | TCP proxy adding 50 ms per direction (≈100 ms DB RTT); CDP `Network.emulateNetworkConditions` at 400 ms for browser↔API RTT |

No production data was written. All load tests used the isolated local database.

---

## 3. Measurements

### 3.1 Local baseline (DB on localhost, no WAN)

| Endpoint | p50 | p95 / max | Payload |
|---|---:|---:|---:|
| `GET /health` | 0.6 ms | 1.7 ms | 0.1 KB |
| `GET /auth/me` (warm cache) | 0.8 ms | 1.7 ms | 0.2 KB |
| `GET /dashboard` (cold cache) | 74.9 ms | — | 65.7 KB |
| `GET /dashboard` (warm cache) | 4.0 ms | 6.7 ms | 65.7 KB |
| `GET /patients?page=1&limit=20` | 4.1 ms | 5.6 ms | 19.7 KB |
| `GET /patients?q=Aarav` | 8.1 ms | 9.8 ms | 19.7 KB |
| `GET /patients/stats` | 5.2 ms | 6.0 ms | 0.1 KB |
| `GET /appointments?page=1&limit=20` | 12.4 ms | 14.7 ms | 10.0 KB |
| `GET /appointments/stats` | 11.8 ms | 12.3 ms | 0.1 KB |
| `GET /billing?page=1&limit=20` | 6.1 ms | 7.1 ms | 14.2 KB |
| `GET /prescriptions?page=1&limit=20` | 5.3 ms | 6.5 ms | 8.0 KB |
| `GET /doctors?limit=50` | 2.5 ms | 3.8 ms | 8.1 KB |
| `GET /medical-record/folders` | 3.2 ms | 3.8 ms | 2.9 KB |
| `GET /pharmacy/medicines` | 2.7 ms | 3.3 ms | 7.1 KB |
| `GET /pharmacy/inventory` | 2.8 ms | 4.6 ms | 11.1 KB |
| `GET /doctors/:id/overview` (365 d) | 43.8 ms | 51.4 ms | 42.6 KB |
| `POST /auth/login` | **257 ms** | 260 ms | — |
| `POST /pharmacy/sales` (5 items) | 23 ms | — | — |
| `POST /patients` (+ awaited audit) | 11 ms | — | — |

**Conclusion:** every piece of application code is fine on a LAN. The problem is not slow JavaScript or bad indexes on a local DB.

### 3.2 Same code, 100 ms database RTT (Sydney → Mumbai)

| Endpoint | p50 at 0 ms | p50 at 100 ms | Added by the link |
|---|---:|---:|---:|
| `GET /health` | 0.6 ms | 1 ms | 0 (no DB) |
| `GET /patients?page=1&limit=20` | 4.1 ms | **106 ms** | +102 ms |
| `GET /patients?q=Aarav` | 8.1 ms | **110 ms** | +102 ms |
| `GET /patients/stats` | 5.2 ms | **105 ms** | +100 ms |
| `GET /appointments?page=1&limit=20` | 12.4 ms | **114 ms** | +102 ms |
| `GET /appointments/stats` | 11.8 ms | **112 ms** | +100 ms |
| `GET /billing?page=1&limit=20` | 6.1 ms | **107 ms** | +101 ms |
| `GET /prescriptions?page=1&limit=20` | 5.3 ms | **106 ms** | +101 ms |
| `GET /doctors?limit=50` | 2.5 ms | **105 ms** | +102 ms |
| `GET /medical-record/folders` | 3.2 ms | **308 ms** | +305 ms (3 sequential ops) |
| `GET /doctors/:id/overview` (365 d) | 43.8 ms | **797 ms** | +753 ms (11 ops) |
| `GET /dashboard` (cold) | 74.9 ms | **546–576 ms** | +470 ms (13 ops) |
| `POST /auth/login` | 257 ms | **458 ms** | +200 ms |
| `POST /pharmacy/sales` (5 items) | 23 ms | **4,090 ms** | +4,067 ms (42 ops) |

This is the single most important table in the report: **the application code multiplies the link latency by the number of sequential round trips it makes.**

### 3.3 Database operations per request (MongoDB profiler)

| Request | DB ops | What they are | Notes |
|---|---:|---|---|
| `GET /dashboard` (cold) | **13** | auth 3, doctors 2, appointments 2, bills 3, patients 2, prescriptions 1 | 9 dashboard queries in parallel but still ~5.5 waves |
| `GET /patients` | **2** | list + `countDocuments` | `keysExamined=2,020` for 20 rows |
| `GET /patients?q=…` | **2** | list + count | `docsExamined=2,400` = full clinic scan (unanchored regex) |
| `GET /appointments` | **2** | list + count | `keysExamined=20,061` |
| `GET /appointments/stats` | **4** | 4 separate counts | `keysExamined=26,701` |
| `GET /billing` | **2** | list + count | `keysExamined=6,061` |
| `GET /doctors/:id/overview` | **11** | doctors 1, appointments 4, bills 3, patients 2, neo 1 | loads rows into Node |
| `GET /avatars/:type/:id` (404) | **1** | avatar lookup | **plus** the auth path on a cache miss |
| `POST /pharmacy/sales` (5 items) | **42** | inventory 20, stock movements 10, medicines 5, sales 3, settings 1, audit 1, neo 2 | sequential per item/batch |
| `GET /auth/me` (cold) | **3** | revoked-token check → user → clinic | sequential |
| `GET /auth/me` (warm) | **0** | memory cache | — |
| `GET /auth/me` as doctor with `users.doctorId=null` | **1 every request** | `clc_doctors` fallback lookup | never cached |

### 3.4 Browser page loads (production-like: 400 ms client RTT + 100 ms DB RTT)

| Page | LCP | All API traffic finished | Data requests | Avatar requests |
|---|---:|---:|---:|---:|
| Dashboard (after login) | — (client nav) | **2.3 s** | 6 | 6 |
| `/clinic/patients` | **1.33 s** | **1.8 s** | 6 | 11 |
| `/clinic/appointments` | **1.32 s** | **2.6 s** | 7 | 21 |
| `/clinic/medical-record` | **1.45 s** | **8.3 s** | 10 | **101** |

With the database on localhost (no WAN), the medical-records page still made **111 API calls** and accumulated **12.9 s of aggregate API time** — the per-row avatar burst alone saturates the browser's 6-connection limit and the API's event loop.

The login page's first paint is ~2.0 s locally because `app/globals.css` starts with a render-blocking `@import url("https://fonts.googleapis.com/...")`; in this offline test environment that request times out. In production it depends on the user's route to Google Fonts, but it is still an unnecessary blocking external dependency.

### 3.5 Live production spot check (from this test machine)

| Measurement | Result |
|---|---|
| `GET https://api.myclinic.myenum.in/health` (10 samples) | min **1.29 s**, median **1.54 s**, max **4.61 s** TTFB |
| TCP connect to API `13.239.83.200:443` | 512–1,234 ms |
| TCP connect to Atlas Mumbai `159.41.168.67:27017` | 39–58 ms (occasional 444–454 ms) |
| `https://myclinic.myenum.in/login` first request | TTFB 4.53 s (DNS 1.95 s + TLS 2.27 s) |

The absolute production numbers fluctuate with this machine's egress and with server load; earlier samples of the same `/health` endpoint were ~0.41 s. The stable signal is the topology: **the API is one WAN hop away from the database and one WAN hop away from most users.**

---

## 4. Root causes

### 4.1 Infrastructure topology (dominant)

- `frontend/vercel.json` deploys compute to **`sin1`**.
- The API runs on EC2 in **`ap-southeast-2` (Sydney)** — `13.239.83.200`.
- Atlas shards are in **Mumbai**.
- `backend/src/lib/db-pools.ts` already contains tuning/comments for the flaky Sydney↔Mumbai link — the team has been compensating for this in code.

Every Mongo query pays ~100 ms. Every browser→API call pays the client↔Sydney RTT (0.4–1.5 s measured). A page with 4 sequential waves costs seconds before rendering data.

### 4.2 Avatar N+1 (worst UX multiplier)

- `frontend/components/clinic/person-avatar.tsx:84` calls `getAvatarUrl()` once **per rendered row**.
- `frontend/lib/clinic-api.ts:2186` fetches the avatar bytes with a Bearer token — a full authenticated API request, not a cached image URL.
- `frontend/app/clinic/medical-record/page.tsx:823-830` loads 100 patients and renders 100 avatars.
- Each 404 still costs: JWT verification + auth/revocation check + one `clc_avatars` query. A 404 is not cached across page loads.
- Result: **101 extra requests per medical-records load**, 8.3 s page settle on the simulated production link. The dashboard, patients, appointments, and billing pages all repeat the same pattern at smaller scale.

### 4.3 Auth middleware does more work than it needs to

- `backend/src/clinic/core/scope.ts:53,62` loads the user and then the clinic **sequentially**.
- `backend/src/clinic/core/revocation.ts` adds a second cache/DB check (15 s TTL).
- `backend/src/clinic/core/scope.ts:157-166`: when `users.doctorId` is null, every request performs an **uncached `clc_doctors` lookup**. Profiling confirmed 1 DB op on every warm `/auth/me` for a doctor account.
- `backend/src/clinic/core/cache.ts:98` has no in-flight coalescing, so a burst of requests (e.g. 100 avatars) all miss the same cache key and stampede the DB.

### 4.4 Pharmacy write path is a per-item loop

- `backend/src/clinic/modules/pharmacy/pharmacy.service.ts` (loops around L404, 621, 697, 800, 1027, 1084, 1123; `consumeBatch` around L895) reads/updates each medicine, inventory batch, and stock movement one at a time.
- Measured: **42 DB operations for a 5-item sale** → **4.09 s** at 100 ms RTT. A 20-item sale would be ~16 s.
- Each mutation also `await writeAudit` (89 call sites), adding one more round trip per write.

### 4.5 Counts and analytics scan too much

- List endpoints run `countDocuments` on every page: appointments `keysExamined=20,061`; stats `26,701`; billing `6,061`.
- `backend/src/clinic/modules/doctors/doctor-analytics.service.ts:151,219` loads all appointments/bills into Node instead of aggregating in Mongo.
- `backend/src/clinic/modules/dashboard/dashboard.service.ts` runs 9 queries plus a full revenue aggregate and a 400-bill fetch every 30 s.
- `backend/src/clinic/modules/appointments/appointments.repository.ts:96`, `patients.repository.ts:74`, `pharmacy.repository.ts:120`: unanchored, case-insensitive regex searches (`docsExamined=2,400` for a 2,000-patient clinic).

### 4.6 Login CPU

- `backend/src/clinic/modules/auth/auth.service.ts:48,273`: bcryptjs cost **12** = **257 ms** per login on this machine (single-threaded, blocks the event loop).
- `auth.service.ts:369-374`: phone login can loop over up to **50 users doing bcrypt compares** — worst case ≈12.8 s of CPU for one login.
- Native `bcrypt`/`argon2` would be 3–5× faster; the phone-login loop should query by indexed phone, not scan candidates.

### 4.7 Frontend delivery

- `frontend/lib/clinic-api.ts:669`: `fetch` has **no timeout**; a stalled request can hang the session gate.
- `frontend/hooks/use-clinic-session.ts:36` + `frontend/app/clinic/layout.tsx:21,39`: the clinic shell waits for `/auth/me` before rendering, so every cold page load pays the auth round trip before content appears.
- `frontend/app/globals.css:1`: render-blocking Google Fonts `@import`.
- `frontend/app/api/[...path]/route.ts`: buffering proxy with a 25 s timeout is the fallback path.
- Login page ships **202 KB JS + 51 KB CSS** (measured transfer).

---

## 5. Fix plan (impact vs effort)

### P0 — infrastructure, no application rewrite

1. **Move the API to Mumbai (`ap-south-1`)** and keep Atlas in Mumbai.
   - Removes ~100 ms from **every** DB operation.
   - Estimated: patients list 106 → ~5–10 ms; dashboard 546 → ~80 ms; sale 4.1 s → ~0.15 s; doctor overview 0.8 s → ~0.05 s.
2. **Set Vercel region to `bom1`** if most users are in India (currently `sin1`). This removes one WAN hop from the browser→API path.
3. If the team prefers Sydney, then move the Atlas cluster to `ap-southeast-2`; the important rule is **API and DB in the same region**.

### P1 — highest user-visible impact

4. **Remove the avatar N+1.**
   - Return `hasAvatar` + `avatarUpdatedAt` (or a signed, cacheable URL) in patient/doctor list payloads.
   - Or add one batch endpoint (`POST /avatars/batch` with ≤100 IDs) and give the responses `Cache-Control: private, max-age=…`.
   - Lazy-load avatars only when the row is visible; cache negative results.
   - Expected: medical records **8.3 s → ~1.5–2 s**; appointments 2.6 → ~1.4 s; patients 1.8 → ~1.2 s.
5. **Fix the doctor lookup.** Persist `doctorId` on `clc_users` (migration + on create) or cache the `clc_doctors` result with the same 30 s TTL. Removes one query (~100 ms) from **every** doctor request.
6. **Batch pharmacy writes.**
   - Preload all medicines/batches with `$in`.
   - Use `bulkWrite` for inventory updates and stock movements.
   - Make the audit write fire-and-forget or insert it in the same bulk operation.
   - Expect 42 ops → 5–8 ops; 5-item sale **4.1 s → ~0.4 s**.
7. **Stop counting on every request.** Use cached counters / `estimatedDocumentCount`, add date filters, and cache stats for 30–60 s.
8. **Aggregate analytics in Mongo** (`$match` + `$group`) instead of loading rows into Node (`doctor-analytics.service.ts`).

### P2 — tuning and guardrails

9. Parallelize the user+clinic lookups in `scope.ts`; combine revocation into a `tokenVersion` on the user document.
10. Add in-flight coalescing to `cached()` so a burst of identical cache misses hits the DB once.
11. Use native `bcrypt` (or reduce cost to 10–11 after measuring) and fix phone login to query by an indexed phone field; cap compare attempts. Single login 257 → ~80 ms; 50-compare worst case → one query.
12. Make `writeAudit` non-blocking (queue/batch), or accept it only on critical actions.
13. Add `AbortSignal.timeout(15_000)` to all frontend fetches; retry only idempotent GETs.
14. Reduce the medical-records initial load: it currently fetches 7 lists at `limit=100` (200 KB) before rendering. Load the active tab only, then paginate.
15. Self-host Inter with `next/font/local`; remove the Google Fonts `@import`.
16. For search, use anchored prefixes or Atlas Search; the current regex scans every patient/record in the clinic.
17. Consider extending the dashboard cache with stale-while-revalidate so a cold 13-query spike never hits a user.

---

## 6. What “fixed” should look like

| Scenario | Now (production-like) | After P0+P1 |
|---|---:|---:|
| Patients list (server time) | ~106 ms | ~5–10 ms |
| Appointments stats | ~112 ms | ~10 ms |
| Dashboard cold | ~546 ms | ~80 ms |
| Doctor overview 365 d | ~797 ms | ~50–100 ms |
| Pharmacy sale, 5 items | **4.09 s** | ~0.4 s |
| Medical-records page settle | **8.3 s** | ~1.5–2 s |
| Doctor request auth overhead | +1 query every request | 0 |
| Login (single) | 257 ms CPU | ~80 ms |

---

## 7. Notes / caveats

- Synthetic dataset (2 k patients / 20 k appointments) is enough to expose scan and round-trip behavior but not production concurrency. No load test with hundreds of simultaneous users was run.
- The 400 ms client RTT and 100 ms DB RTT are **simulated** to match the measured Sydney↔Mumbai and India↔Sydney paths. They are a lower bound for real users on slow mobile networks.
- `/health` has no DB access. Its production TTFB (1.3–4.6 s during this test) is network/event-loop overhead, not a database problem; earlier samples were ~0.41 s.
- No application code was changed. The local `.env` files and build output were restored after testing.
