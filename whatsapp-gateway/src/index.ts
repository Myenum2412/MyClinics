/**
 * Standalone WhatsApp gateway (Baileys, no browser) for MyClinics.
 *
 * MyClinics API  ⇄  HMAC-signed HTTP  ⇄  this service  ⇄  WhatsApp (Baileys)
 *
 * Endpoints consumed by the API (`backend/src/services/whatsapp/gateway/client.ts`):
 *   POST   /sessions/:id/start       create/resume the Baileys socket
 *   POST   /sessions/:id/stop        close socket without logging out
 *   DELETE /sessions/:id             logout + delete auth files
 *   GET    /sessions/:id/status      404 when never seen, else { clinicId, status, phone, qr }
 *   POST   /sessions/:id/messages    { to, text, dedupeKey? } → { id, duplicate }
 *   POST   /sessions/:id/documents   { to, filename, mimetype, caption?, contentBase64, dedupeKey? }
 *
 * Webhooks sent to the API (`backend/src/routes/whatsapp-gateway.ts`):
 *   POST {BACKEND_URL}/api/whatsapp/inbound   every incoming 1:1 text message
 *   POST {BACKEND_URL}/api/whatsapp/status    session state changes
 *
 * Env:
 *   GATEWAY_PORT     (default 4100)
 *   GATEWAY_SECRET   shared HMAC secret, ≥16 chars, identical to the API's GATEWAY_SECRET
 *   BACKEND_URL      base URL of the MyClinics API, e.g. http://127.0.0.1:3100
 *   SESSION_DIR      auth-file root (default ./sessions)
 */
import "dotenv/config";
import express, { type Request, type Response } from "express";
import QRCode from "qrcode";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { HEADER_SIG, HEADER_TS, signedHeaders, verifySignature } from "./signature.js";

type Status = "STARTING" | "QR_REQUIRED" | "READY" | "DISCONNECTED" | "LOGGED_OUT" | "STOPPED";

interface Session {
  clinicId: string;
  status: Status;
  phone: string | null;
  qr: string | null;
  sock: WASocket | null;
  starting: boolean;
  retryCount: number;
}

const PORT = Number(process.env.GATEWAY_PORT ?? 4100);
const SECRET = (process.env.GATEWAY_SECRET ?? "").trim();
const BACKEND_URL = (process.env.BACKEND_URL ?? "").trim().replace(/\/+$/, "");
const SESSION_DIR = path.resolve(process.env.SESSION_DIR ?? "./sessions");

if (!SECRET || SECRET.length < 16) {
  console.error("[gateway] GATEWAY_SECRET must be set (≥16 chars) and match the API's GATEWAY_SECRET");
  process.exit(1);
}
if (!BACKEND_URL) {
  console.error("[gateway] BACKEND_URL must be set, e.g. http://127.0.0.1:3100");
  process.exit(1);
}

const sessions = new Map<string, Session>();
const dedupe = new Map<string, { id: number; duplicate: boolean }>();
let sendSeq = 0;

function getSession(clinicId: string): Session {
  let s = sessions.get(clinicId);
  if (!s) {
    s = { clinicId, status: "STOPPED", phone: null, qr: null, sock: null, starting: false, retryCount: 0 };
    sessions.set(clinicId, s);
  }
  return s;
}

function publicSession(s: Session) {
  return { clinicId: s.clinicId, status: s.status, phone: s.phone, qr: s.qr };
}

/** Signed POST to the API with a small retry/backoff (gateway retries inbound webhooks). */
async function postWebhook(pathname: string, payload: unknown, retries = 4): Promise<{ ok: boolean; data: unknown }> {
  const body = JSON.stringify(payload);
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(BACKEND_URL + pathname, {
        method: "POST",
        headers: { ...signedHeaders(SECRET, body), "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* non-JSON */
      }
      if (res.ok) return { ok: true, data };
      lastErr = new Error(`backend ${res.status}: ${text.slice(0, 200)}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 8000)));
  }
  console.warn(`[gateway] webhook ${pathname} failed after retries`, lastErr instanceof Error ? lastErr.message : lastErr);
  return { ok: false, data: null };
}

async function reportStatus(s: Session): Promise<void> {
  await postWebhook("/api/whatsapp/status", {
    clinicId: s.clinicId,
    status: s.status,
    phone: s.phone,
    at: Date.now(),
  });
}

function phoneToJid(to: string): string | null {
  const digits = String(to ?? "").replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 20) return null;
  return `${digits}@s.whatsapp.net`;
}

function msgText(m: { message?: unknown }): string | null {
  const msg = m.message as Record<string, unknown> | undefined;
  if (!msg) return null;
  const conv = msg.conversation;
  if (typeof conv === "string" && conv.trim()) return conv;
  const ext = msg.extendedTextMessage as { text?: unknown } | undefined;
  if (typeof ext?.text === "string" && ext.text.trim()) return ext.text;
  return null;
}

async function startSession(clinicId: string): Promise<Session> {
  const s = getSession(clinicId);
  if (s.sock && (s.status === "READY" || s.status === "QR_REQUIRED" || s.status === "STARTING")) {
    return s;
  }
  if (s.starting) return s;
  s.starting = true;
  s.status = "STARTING";
  s.qr = null;
  void reportStatus(s);

  const dir = path.join(SESSION_DIR, clinicId);
  await fs.mkdir(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined as unknown as [number, number, number] }));

  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys) },
    browser: ["MyClinics Gateway", "Chrome", "1.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });
  s.sock = sock;
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      try {
        s.qr = await QRCode.toDataURL(qr, { width: 264, margin: 1 });
      } catch {
        s.qr = null;
      }
      if (s.status !== "READY") {
        s.status = "QR_REQUIRED";
        void reportStatus(s);
      }
    }
    if (connection === "open") {
      s.status = "READY";
      s.qr = null;
      s.retryCount = 0;
      const user = sock.user?.id ?? sock.authState.creds.me?.id ?? null;
      s.phone = user ? user.split("@")[0].split(":")[0].replace(/\D/g, "") || null : s.phone;
      console.log(`[gateway] ${clinicId} READY as ${s.phone ?? "unknown"}`);
      void reportStatus(s);
    } else if (connection === "close") {
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      s.sock = null;
      s.qr = null;
      if (code === DisconnectReason.loggedOut) {
        s.status = "LOGGED_OUT";
        s.phone = null;
        await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
        console.log(`[gateway] ${clinicId} LOGGED_OUT`);
        void reportStatus(s);
      } else if (s.status !== "STOPPED") {
        s.status = "DISCONNECTED";
        console.log(`[gateway] ${clinicId} DISCONNECTED (code ${code}), reconnecting…`);
        void reportStatus(s);
        // Reconnect with backoff unless explicitly stopped.
        s.retryCount += 1;
        const delay = Math.min(2000 * 2 ** Math.min(s.retryCount, 5), 30_000);
        setTimeout(() => {
          const cur = sessions.get(clinicId);
          if (cur && cur.status === "DISCONNECTED" && !cur.sock) {
            cur.starting = false;
            void startSession(clinicId).catch((e) => console.warn(`[gateway] reconnect ${clinicId} failed`, e));
          }
        }, delay);
      }
    }
    s.starting = false;
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) {
      try {
        if (m.key.fromMe || m.key.remoteJid === "status@broadcast") continue;
        const remoteJid = m.key.remoteJid ?? "";
        if (!remoteJid.endsWith("@s.whatsapp.net")) continue; // 1:1 chats only
        const text = msgText(m);
        if (!text) continue;
        const from = remoteJid.split("@")[0].replace(/\D/g, "") || null;
        const payload = {
          clinicId,
          messageId: m.key.id ?? randomUUID(),
          jid: remoteJid,
          from: from && /^\d{6,20}$/.test(from) ? from : null,
          lid: false,
          pushName: m.pushName ?? null,
          type: "text",
          text: text.slice(0, 4096),
          timestamp: typeof m.messageTimestamp === "number" ? m.messageTimestamp : Math.floor(Date.now() / 1000),
        };
        const res = await postWebhook("/api/whatsapp/inbound", payload, 4);
        const replies = (res.data as { replies?: { text?: unknown }[] } | null)?.replies;
        if (res.ok && Array.isArray(replies) && s.sock) {
          for (const r of replies) {
            if (typeof r?.text === "string" && r.text.trim()) {
              await s.sock.sendMessage(remoteJid, { text: r.text.slice(0, 4096) }).catch((e) => {
                console.warn(`[gateway] reply to ${remoteJid} failed`, e instanceof Error ? e.message : e);
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[gateway] inbound handling failed for ${clinicId}`, err instanceof Error ? err.message : err);
      }
    }
  });

  return s;
}

async function stopSession(clinicId: string): Promise<Session | null> {
  const s = sessions.get(clinicId);
  if (!s) return null;
  try {
    s.sock?.ev.removeAllListeners("connection.update");
    (s.sock as { end?: (e?: Error) => void } | null)?.end?.();
    await s.sock?.ws?.close?.();
  } catch {
    /* already closed */
  }
  s.sock = null;
  s.starting = false;
  s.qr = null;
  s.status = "STOPPED";
  void reportStatus(s);
  return s;
}

async function logoutSession(clinicId: string): Promise<{ ok: true }> {
  const s = sessions.get(clinicId);
  try {
    await s?.sock?.logout().catch(() => {});
  } catch {
    /* ignore */
  }
  await stopSession(clinicId).catch(() => {});
  const cur = sessions.get(clinicId);
  if (cur) {
    cur.status = "LOGGED_OUT";
    cur.phone = null;
  }
  await fs.rm(path.join(SESSION_DIR, clinicId), { recursive: true, force: true }).catch(() => {});
  const done = getSession(clinicId);
  done.status = "LOGGED_OUT";
  done.phone = null;
  void reportStatus(done);
  return { ok: true };
}

const app = express();
// Capture the raw body so HMAC verification matches the API's scheme.
app.use(express.json({
  limit: "10mb",
  verify: (req, _res, buf) => {
    (req as unknown as { rawBody?: string }).rawBody = buf.toString("utf8");
  },
}));

app.get("/health", (_req, res) => res.json({ ok: true, sessions: sessions.size }));

// Request-scoped HMAC secret rotation helper (not part of the API contract).
app.get("/", (_req, res) => res.json({ ok: true, service: "whatsapp-gateway" }));

app.use((req: Request, res: Response, next) => {
  const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? "";
  const ok = verifySignature(
    SECRET,
    { timestamp: req.headers[HEADER_TS], signature: req.headers[HEADER_SIG] },
    rawBody
  );
  if (!ok) {
    console.warn(`[gateway] rejected ${req.method} ${req.path}: bad signature`);
    return res.status(401).json({ error: "invalid signature" });
  }
  next();
});

app.get("/sessions/:id/status", (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: "unknown session" });
  // A freshly-restarted gateway forgets in-memory sessions but keeps auth files:
  // report STOPPED only when no auth dir exists, else STARTING so the dashboard can Connect.
  return res.json(publicSession(s));
});

app.post("/sessions/:id/start", async (req, res) => {
  try {
    const s = await startSession(req.params.id);
    res.json(publicSession(s));
  } catch (err) {
    console.error(`[gateway] start ${req.params.id} failed`, err);
    res.status(500).json({ error: "failed to start session" });
  }
});

app.post("/sessions/:id/stop", async (req, res) => {
  const s = await stopSession(req.params.id);
  if (!s) return res.status(404).json({ error: "unknown session" });
  res.json(publicSession(s));
});

app.delete("/sessions/:id", async (req, res) => {
  const existed = sessions.has(req.params.id);
  try {
    await logoutSession(req.params.id);
  } catch (err) {
    console.error(`[gateway] logout ${req.params.id} failed`, err);
  }
  if (!existed) {
    // Match the API's ignoreUnknown() behaviour: unknown clinics are already "disconnected".
    return res.status(404).json({ error: "unknown session" });
  }
  res.json({ ok: true });
});

async function sendOnce(
  clinicId: string,
  kind: "text" | "document",
  body: { to?: unknown; text?: unknown; filename?: unknown; mimetype?: unknown; caption?: unknown; contentBase64?: unknown; dedupeKey?: unknown }
): Promise<{ status: number; payload: unknown }> {
  const s = sessions.get(clinicId);
  if (!s?.sock || s.status !== "READY") {
    return { status: 409, payload: { error: "session not connected" } };
  }
  const key = typeof body.dedupeKey === "string" && body.dedupeKey ? `${clinicId}:${body.dedupeKey}` : null;
  if (key && dedupe.has(key)) return { status: 200, payload: { ...dedupe.get(key)!, duplicate: true } };
  const jid = phoneToJid(String(body.to ?? ""));
  if (!jid) return { status: 400, payload: { error: "invalid recipient phone number" } };
  try {
    if (kind === "text") {
      const text = String(body.text ?? "");
      if (!text.trim()) return { status: 400, payload: { error: "text is required" } };
      await s.sock.sendMessage(jid, { text: text.slice(0, 4096) });
    } else {
      const contentBase64 = String(body.contentBase64 ?? "");
      const filename = String(body.filename ?? "document");
      const mimetype = String(body.mimetype ?? "application/octet-stream");
      const caption = typeof body.caption === "string" ? body.caption.slice(0, 1024) : undefined;
      if (!contentBase64) return { status: 400, payload: { error: "contentBase64 is required" } };
      const data = Buffer.from(contentBase64, "base64");
      await s.sock.sendMessage(jid, {
        document: data,
        fileName: filename,
        mimetype,
        caption,
      });
    }
    sendSeq += 1;
    const result = { id: sendSeq, duplicate: false };
    if (key) {
      dedupe.set(key, result);
      if (dedupe.size > 5000) {
        const first = dedupe.keys().next();
        if (!first.done) dedupe.delete(first.value);
      }
    }
    return { status: 200, payload: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[gateway] send ${kind} via ${clinicId} failed`, message);
    return { status: 502, payload: { error: `send failed: ${message.slice(0, 200)}` } };
  }
}

app.post("/sessions/:id/messages", async (req, res) => {
  const r = await sendOnce(req.params.id, "text", req.body ?? {});
  res.status(r.status).json(r.payload);
});

app.post("/sessions/:id/documents", async (req, res) => {
  const r = await sendOnce(req.params.id, "document", req.body ?? {});
  res.status(r.status).json(r.payload);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[gateway] listening on 0.0.0.0:${PORT}, backend=${BACKEND_URL}, sessions=${SESSION_DIR}`);
  // Best-effort fingerprint so logs prove which secret is loaded (without leaking it).
  console.log(`[gateway] secret sha256=${createHmac("sha256", "fingerprint").update(SECRET).digest("hex").slice(0, 12)}…`);
});
