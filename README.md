# MyClinics

A clinic management platform with a WhatsApp AI assistant that books, reschedules and
cancels appointments for patients, answers clinic questions, sends appointment
reminders and turn alerts.

## Features

- **Dashboard** — appointments, patients, doctors, billing, medicines, prescriptions
  and reports management, plus a live queue with per-day counter numbers.
- **Patient portal** — patients sign in to view their appointments, bills, reports,
  prescriptions and profile.
- **WhatsApp AI agent** — answers clinic questions and handles booking, rescheduling and
  cancellation over WhatsApp, grounded strictly in the clinic's `soul.md` and knowledge
  base.
- **Appointment reminders** — WhatsApp reminders sent ~30 minutes before each
  appointment, driven by a cron webhook.
- **Turn alerts** — when a patient is marked complete, the next patient in the queue is
  automatically notified that it's their turn.
- **Billing & reports** — invoices with GST/payment tracking, and file uploads stored in
  Cloudflare R2 with signed download URLs.
- **Role-based auth** — clinic staff and patient accounts (credentials login with optional
  Google OAuth).

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 — `frontend/` (UI only)
- [Fastify](https://fastify.dev) 5 — `backend/` (standalone API server)
- [next-auth](https://next-auth.js.org) v5 (beta) with MongoDB adapter
- [MongoDB](https://www.mongodb.com/) (Atlas) via the native driver
- [Tailwind CSS](https://tailwindcss.com) v4 + shadcn-style UI components
- [whatsapp-web.js](https://wwebjs.dev) for the WhatsApp client
- [NVIDIA NIM](https://integrate.api.nvidia.com) for LLM chat + embeddings
- [Cloudflare R2](https://developers.cloudflare.com/r2/) for report file storage
- [vitest](https://vitest.dev) for testing

## Architecture

An npm-workspaces monorepo with two packages sharing one MongoDB database:

```
myclinics/
├── frontend/   # Next.js 16 UI (dashboard + patient portal + next-auth)
└── backend/    # Fastify API server (all /api/* routes) + WhatsApp worker
```

1. **API server** (`backend/`, port 3100) — every `/api/*` route lives here. It
   re-verifies the next-auth session cookie itself (jose JWE decryption), so requests
   proxied from the frontend are authenticated without a second source of truth.
2. **Web server** (`frontend/`, port 3456) — serves the dashboard and patient portal.
   `/api/*` requests (except `/api/auth`) are proxied to the API server via Next.js
   rewrites. next-auth runs in-process; server components may read MongoDB directly
   for page data.
3. **WhatsApp worker** (`backend/`) — connects WhatsApp as a linked device and
   processes incoming messages. It calls the AI only through the internal `/api/ai/*`
   endpoints (authenticated with `AI_INTERNAL_TOKEN`), so the bot can never touch
   dashboard modules directly.

### Performance & data handling

- MongoDB **indexes** are created on server start (`backend/src/lib/indexes.ts`), plus
  **connection pooling** with tuned timeouts (`backend/src/lib/db.ts`).
- List endpoints support **server-side pagination + search**
  (`?page=&pageSize=&q=` → `{ rows, total, page, pageSize, pageCount }`); without a
  `page` param they return the legacy flat array (capped at 200). The dashboard tables
  use the paginated form via `useServerPagination` (`frontend/hooks/`).
- Responses are **gzip-compressed** and tagged with **ETags**; frequently-read data
  (doctors, medicines, organization, soul, knowledge, AI context) is **TTL-cached**
  and invalidated on writes.
- Reminder/notification/queue services batch writes with **bulk operations** and
  windowed queries instead of per-document round trips.

The AI is constrained by a **knowledge boundary**: every reply must come from the
clinic's `soul.md` and the retrieved knowledge-base documents. If the answer isn't
there, the bot returns the configured fallback reply instead of guessing. Prices quoted
by the model are checked against the authorized context before being sent.

## Getting started

### Prerequisites

- Node.js 20+ (the project is developed on Node 24)
- A MongoDB database (e.g. MongoDB Atlas)
- An NVIDIA API key ([build.nvidia.com](https://build.nvidia.com))
- (Optional) Cloudflare R2 bucket for report uploads, Google OAuth credentials

### Install

```bash
npm install          # from the repo root (installs both workspaces)
```

### Environment

Copy the variables below into `frontend/.env.local` (or the repo root `.env.local` —
the API server and worker search both locations). A template lives in `.env.example`:

```bash
# --- Core ---
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/myclinic
AUTH_SECRET=<generate a long random string>
AI_INTERNAL_TOKEN=<64-char random string, shared by web server and worker>

# Optional. Frontend proxies /api/* here (default http://localhost:3100)
BACKEND_URL=http://localhost:3100

# --- AI (NVIDIA NIM) ---
NVIDIA_API_KEY=nvapi-...
NVIDIA_MODEL=minimaxai/minimax-m3
# Comma-separated fallbacks tried when the primary model is rate-limited/unavailable
NVIDIA_MODEL_FALLBACKS=openai/gpt-oss-20b,meta/llama-3.1-8b-instruct
NVIDIA_TIMEOUT_MS=60000
# Optional overrides:
# NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
# NVIDIA_EMBED_URL=https://integrate.api.nvidia.com/v1/embeddings
# NVIDIA_EMBED_MODEL=snowflake/arctic-embed-l

# --- WhatsApp worker ---
WHATSAPP_SESSION_PATH=C:\path\to\whatsapp-session
# Optional: pin the Chrome binary used by the headless browser
# WHATSAPP_CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# --- Reminder cron webhook (cron-job.org) ---
CRON_SECRET=<random string, also set as the job header x-cron-secret>

# --- Cloudflare R2 (reports) ---
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key id>
R2_SECRET_ACCESS_KEY=<secret access key>
R2_BUCKET_NAME=<bucket name>

# --- Optional: Google OAuth ---
# AUTH_GOOGLE_ID=
# AUTH_GOOGLE_SECRET=
```

### Run

```bash
npm run dev        # API server (3100) + web server (3456) together
npm run whatsapp   # WhatsApp worker (separate terminal)
```

Open http://localhost:3456, sign up, and create a doctor account. Then link the
WhatsApp bot:

1. Start the worker — it prints a QR code.
2. On your phone: WhatsApp → Linked devices → Link a device → scan the QR image saved
   to `WHATSAPP_SESSION_PATH\qr.png` (the worker refreshes it until scanned).
3. The worker log should show `whatsapp connected` / `ready`, and status is written to
   `status.json` in the session folder.

## WhatsApp AI assistant

- The bot's personality and knowledge boundary live in `backend/src/souls/default.md`
  (editable in the dashboard under **Settings**).
- Additional facts (location, fees, policies, hours) live in the **knowledge base**,
  also editable from Settings. Only these documents plus the soul are allowed into the
  prompt.
- Booking flow: the bot collects doctor → date → time, asks one question at a time,
  confirms once, then creates the appointment through the backend. Customers are
  identified by their WhatsApp profile name, so it never asks for a name.
- Conversation memory: facts are extracted and stored per customer, and long
  conversations are summarized automatically.

## Appointment reminders

- The worker scans for upcoming appointments every 30 seconds and queues WhatsApp
  reminders for appointments that are **20–40 minutes** away (`REMINDER_MINUTES_BEFORE`
  in `backend/src/services/reminder/reminder.service.ts`).
- A cron job (e.g. cron-job.org) posts every minute to
  `POST /api/cron/reminders` with the header `x-cron-secret: <CRON_SECRET>` to trigger
  an immediate scan. The endpoint returns `{ ok, checked, queued, skipped }`.
- Notifications are persisted in the `wa_notifications` collection with retry
  (max 3 attempts) and sent as soon as the worker is connected.

## Queue & turn alerts

- Each day's appointments (pending/confirmed) get a counter `#` in time order.
- Marking a patient as **completed** renumbers the queue and sends a turn alert to the
  next patient via WhatsApp.

## Scripts

| Script            | Description                                     |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | API server (3100) + web server (3456)           |
| `npm run build`   | Production build (frontend)                     |
| `npm run start`   | Serve the production build + API server         |
| `npm run lint`    | ESLint (frontend)                               |
| `npm test`        | vitest suite (backend)                          |
| `npm run typecheck`| TypeScript check (backend)                     |
| `npm run whatsapp`| Start the WhatsApp worker                       |

## Testing

```bash
npm test
```

The suite covers the AI agent, appointment service, queue/counter logic, reminder
scanning, memory, knowledge retrieval, grounding, intent detection and customer
context, with a fake in-memory MongoDB for services that need one.

## Project structure

```
frontend/             # Next.js 16 UI (dashboard, patient portal, next-auth)
  app/                #   pages + app/api/auth/[...nextauth]
  components/         #   tables, forms, dialogs, shadcn-style ui/
  hooks/              #   use-server-pagination (server-side table paging)
  lib/                #   auth, db, billing, stats, utils, server-api
backend/              # Fastify API server + WhatsApp worker
  src/
    routes/           #   every /api/* route (Fastify)
    plugins/auth.ts   #   next-auth JWE verification + guards
    services/
      ai/             #   LLM client, agent, knowledge, soul, memory, appointment service
      whatsapp/       #   WhatsApp client, worker, message handler, notification queue
      reminder/       #   appointment reminder scanning
      queue.service.ts#   per-day queue counter logic
    souls/default.md  #   WhatsApp AI soul / personality + knowledge boundary
    knowledge/default.md # seeded clinic knowledge base documents
  tests/              # vitest suites (fake in-memory MongoDB)
```
