# WhatsApp gateway integration

MyClinics no longer runs WhatsApp itself. A separate service, **whatsapp-gateway**
(its own repo/server), owns the WhatsApp connections; MyClinics talks to it over
HMAC-signed HTTP. This removes the Chromium/Puppeteer processes that caused
out-of-memory crashes and lets WhatsApp be deployed, restarted and scaled independently.

```
Patient ⇄ WhatsApp ⇄ whatsapp-gateway ── POST /api/whatsapp/inbound ──▶ MyClinics API (menu bot)
                          ▲  ▲                                             │
                          │  └── POST /api/whatsapp/status ──────────────▶ │ wa_clinic_sessions
                          └────── REST: start/stop/send/document ◀─────────┘
                                                         ▲
   worker (npm run whatsapp) ── drains wa_notifications ─┘
```

## Configuration (MyClinics)
| Variable | Purpose |
|---|---|
| `GATEWAY_URL` | Base URL of the gateway, e.g. `http://10.0.0.5:4100` (private network) |
| `GATEWAY_SECRET` | Shared HMAC secret (≥ 16 chars) — identical to the gateway's `GATEWAY_SECRET` |
| `GATEWAY_LEGACY_SESSION_ID` | Optional. Gateway session for notifications that have no clinic (default `platform`) |

Gateway side: `BACKEND_URL` (the API, e.g. `http://localhost:3100`), and the paths default to
`/api/whatsapp/inbound` and `/api/whatsapp/status`.

## What talks to what
| Caller | Call | Where |
|---|---|---|
| Dashboard → API | connect / disconnect / logout / QR status | `clinic/modules/whatsapp/whatsapp.service.ts` → `gateway.*` |
| Gateway → API | every patient message | `routes/whatsapp-gateway.ts` → `services/whatsapp/menu/` |
| Gateway → API | session state changes | `routes/whatsapp-gateway.ts` → `wa_clinic_sessions` |
| Worker → Gateway | queued `wa_notifications` (text + documents) | `services/whatsapp/gateway/drain.ts` |
| Worker → Gateway | platform reminders | `services/reminder/reminder.service.ts` |
| Menu bot → Gateway | report/record files the patient asks for | `menu/tenant.ts` (`openDocument`) |

A clinic's **gateway session id is its `clinicId`**, so one gateway serves every clinic and
each patient message is answered in the right tenant.

## Delivery guarantees
* Outbound is **at-least-once with idempotency**: each notification is sent with the
  dedupe key `notif:<id>`, so overlapping drains or retries can never double-send.
* If the gateway is down, notifications stay `queued` **without consuming retries**;
  if a clinic's number is not connected, its rows wait until it is.
* The gateway retries inbound webhooks with backoff; the bot replays the previous reply
  for a repeated WhatsApp message id instead of advancing the conversation twice.
* Booking never trusts stored menu state: the slot is re-validated and ownership of the
  patient/appointment/file is re-checked against the sender's phone number on every action.

## Security notes
* All gateway ⇄ API requests are signed; timestamps older than 5 minutes are rejected.
  Keep the gateway on a private network — it can send WhatsApp messages as any clinic.
* Patient data is only ever sent to the number that owns the record. Numbers WhatsApp
  hides behind privacy ids (`@lid`) cannot be matched to a patient and are told to call the clinic.
* The gateway uses the unofficial WhatsApp Web protocol (Baileys): use dedicated clinic
  numbers, message only patients who expect it, and plan the move to the Meta Cloud API
  (only `whatsapp-gateway/src/transports/` needs replacing).

## Operating it
* Deploy order: gateway first, then set `GATEWAY_URL/SECRET` and restart the API + worker.
* Existing per-clinic pairings from the old browser worker are **not** migrated: each
  clinic re-scans a QR once (Dashboard → WhatsApp → Connect).
* Old `wa_session_commands` documents are ignored and can be dropped.
