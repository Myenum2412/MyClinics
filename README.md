# MyClinics

A clinic management platform with a WhatsApp AI assistant that books, reschedules and
cancels appointments for patients, answers clinic questions, sends appointment
reminders and turn alerts — all in one Next.js app.

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

- [Next.js](https://nextjs.org) 16 (App Router) + React 19
- [next-auth](https://next-auth.js.org) v5 (beta) with MongoDB adapter
- [MongoDB](https://www.mongodb.com/) (Atlas) via the native driver
- [Tailwind CSS](https://tailwindcss.com) v4 + shadcn-style UI components
- [whatsapp-web.js](https://wwebjs.dev) for the WhatsApp client
- [NVIDIA NIM](https://integrate.api.nvidia.com) for LLM chat + embeddings
- [Cloudflare R2](https://developers.cloudflare.com/r2/) for report file storage
- [vitest](https://vitest.dev) for testing

## Architecture

The app runs as two processes sharing the same MongoDB database:

1. **Web server** (`npm run dev` / `npm run start`) — the Next.js dashboard, patient
   portal, auth and the internal `/api/ai/*` endpoints.
2. **WhatsApp worker** (`npm run whatsapp`) — connects WhatsApp as a linked device and
   processes incoming messages. It calls the AI only through the internal
   `/api/ai/*` endpoints (authenticated with `AI_INTERNAL_TOKEN`), so the bot can never
   touch dashboard modules directly.

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
npm install
```

### Environment

Copy the variables below into `.env.local` (the file is gitignored):

```bash
# --- Core ---
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/myclinic
AUTH_SECRET=<generate a long random string>
APP_URL=http://localhost:3456
AI_INTERNAL_TOKEN=<64-char random string, shared by web server and worker>

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
npm run dev        # web server on http://localhost:3456
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

- The bot's personality and knowledge boundary live in `souls/default.md` (editable in
  the dashboard under **Settings**).
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
  in `services/reminder/reminder.service.ts`).
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

| Script            | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Start the Next.js dev server on port 3456    |
| `npm run build`   | Production build                             |
| `npm run start`   | Serve the production build on port 3456      |
| `npm run lint`    | ESLint                                       |
| `npm test`        | Run the vitest suite                         |
| `npm run whatsapp`| Start the WhatsApp worker                    |

## Testing

```bash
npm test
```

The suite covers the AI agent, appointment service, queue/counter logic, reminder
scanning, memory, knowledge retrieval, grounding, intent detection and customer
context, with a fake in-memory MongoDB for services that need one.

## Project structure

```
app/                  # Next.js routes (dashboard, patient portal, API routes)
components/           # UI components (tables, forms, dialogs, shadcn-style ui/)
lib/                  # shared helpers (db, auth, billing, phone, r2, stats...)
services/
  ai/                 # LLM client, agent, knowledge, soul, memory, appointment service
  whatsapp/           # WhatsApp client, worker, message handler, notification queue
  reminder/           # appointment reminder scanning
  queue.service.ts    # per-day queue counter logic
souls/default.md      # WhatsApp AI soul / personality + knowledge boundary
knowledge/default.md  # seeded clinic knowledge base documents
tests/                # vitest suites
```
