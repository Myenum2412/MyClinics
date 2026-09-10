import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3100";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { message, clinicName, role, clinicId, conversationHistory } = body as {
    message: string;
    clinicName?: string;
    role?: string;
    clinicId?: string;
    conversationHistory?: { role: string; content: string }[];
  };

  if (!message?.trim()) {
    return NextResponse.json({ reply: "How can I help you today?" });
  }

  const lower = message.toLowerCase();

  // Off-topic guard using project context
  const offTopicHints = ["capital of", "weather in", "who won", "cricket score", "movie", "recipe"];
  if (offTopicHints.some((k) => lower.includes(k))) {
    return NextResponse.json({ reply: "I'm designed to assist with this clinic and its services — appointments, doctors, treatments, billing, records, and patient support. How can I help you with the clinic today?" });
  }

  // Clinic-scoped data fetch: ONLY current clinicId, never other clinics. Modules: Appointment, Patients, Medical Records, Treatment, Prescriptions, Medicine
  let projectContext = "";
  const headers: Record<string, string> = {};
  const cookie = (() => { try { return (typeof req !== "undefined" && (req as unknown as { headers: { get(n: string): string | null } }).headers.get("cookie")) ?? ""; } catch { return ""; } })();
  if (cookie) headers.cookie = cookie;
  // Helper to fetch clinic-scoped JSON with auth cookie
  async function fetchClinic(path: string): Promise<unknown | null> {
    if (!clinicId) return null;
    try {
      const r = await fetch(`${BACKEND_URL}/api/clinics/${clinicId}${path}`, { headers, cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }
  try {
    const wantsPatients = /patient|people|person|name|mobile|phone/i.test(message);
    const wantsAppt = /appointment|book|slot|token|queue|schedule|visit/i.test(message);
    const wantsRecords = /record|medical|report|lab|file|document/i.test(message);
    const wantsTreatment = /treatment|diagnosis|complaint|symptom/i.test(message);
    const wantsPresc = /prescription|medicine|drug|tablet|dose|dosage/i.test(message);
    const wantsMedicine = wantsPresc || /pharmacy|stock|inventory/i.test(message);
    const fetchAll = !wantsPatients && !wantsAppt && !wantsRecords && !wantsTreatment && !wantsPresc;

    const tasks: Promise<void>[] = [];
    let ctxParts: string[] = [];

    // Always fetch clinic header (name/settings) scoped to clinicId
    tasks.push((async () => {
      if (process.env.AI_INTERNAL_TOKEN && clinicId) {
        const aiRes = await fetch(`${BACKEND_URL}/api/ai/context?organizationId=${encodeURIComponent(clinicId)}`, {
          headers: { "X-Internal-Token": process.env.AI_INTERNAL_TOKEN, cookie: headers.cookie ?? "" },
          cache: "no-store",
        }).catch(() => null);
        if (aiRes?.ok) {
          const ctx = await aiRes.json().catch(() => null);
          if (ctx) ctxParts.push(`Clinic header: ${JSON.stringify(ctx).slice(0, 800)}`);
          return;
        }
      }
      const clinic = (await fetchClinic("")) as { name?: string; settings?: unknown } | null;
      if (clinic) ctxParts.push(`Clinic: ${clinic.name ?? clinicName ?? clinicId} | ${JSON.stringify((clinic as unknown as { settings?: unknown }).settings ?? {}).slice(0, 600)}`);
    })());

    if (wantsPatients || fetchAll) tasks.push(fetchClinic("/patients?limit=5").then(d => { if (d) ctxParts.push(`Patients (this clinic only, sample 5): ${JSON.stringify(d).slice(0, 1500)}`); }));
    if (wantsAppt || fetchAll) tasks.push(fetchClinic("/appointments?limit=5").then(d => { if (d) ctxParts.push(`Appointments (this clinic only): ${JSON.stringify(d).slice(0, 1500)}`); }));
    if (wantsRecords || fetchAll) tasks.push(fetchClinic("/medical-record?limit=5").then(d => { if (d) ctxParts.push(`Medical Records (this clinic): ${JSON.stringify(d).slice(0, 1500)}`); }));
    if (wantsTreatment || fetchAll) tasks.push(fetchClinic("/medicine?limit=5").then(d => { if (d) ctxParts.push(`Treatment/Medicine Records (this clinic): ${JSON.stringify(d).slice(0, 1500)}`); }));
    if (wantsPresc) tasks.push(fetchClinic("/prescriptions?limit=5").then(d => { if (d) ctxParts.push(`Prescriptions (this clinic): ${JSON.stringify(d).slice(0, 1500)}`); }));
    if (wantsMedicine) tasks.push(fetchClinic("/pharmacy/medicines?limit=5").then(d => { if (d) ctxParts.push(`Pharmacy Medicines (this clinic): ${JSON.stringify(d).slice(0, 1500)}`); }));

    await Promise.all(tasks);
    // Enforce clinic isolation in prompt
    projectContext = `CLINIC_ID=${clinicId ?? "unknown"} — use ONLY this clinic's data. Never use other clinics.\n` + ctxParts.join("\n");
    if (!clinicId) projectContext = "No clinicId provided — cannot access clinic data. Ask user to open a clinic first.";
  } catch {
    // non-blocking
  }

  // OpenRouter — Thinking Machines: Inkling — no system prompt, nurse persona via user context + project data
  const openrouterKey = process.env.OPENROUTER_API_KEY || "";
  const openrouterModel = process.env.OPENROUTER_MODEL || "thinkingmachines/inkling";
  const nurseContext = `You are Ai Root, a friendly clinic nurse assistant for ${clinicName ?? "this clinic"} (${role ?? "patient"} view, CLINIC_ID=${clinicId ?? "unknown"}). Rules: Use ONLY this clinic's data below (Appointment, Patients, Medical Records, Treatment, Prescriptions, Medicine). Never use other clinics' data. You can also help fill forms — when user wants to create appointment/patient/record/prescription, collect required fields and confirm before creating, then tell frontend to autofill the form. Reply as caring nurse, concise, Tamil/English as user uses. If asked who you are, say Ai Root nurse for this clinic, not Inkling. If asked what you do, list: book appointments, manage patients, show medical records/treatment/prescriptions/medicine, and fill forms for this clinic only.`;
  try {
    const userContent = `${nurseContext}\n${projectContext ? projectContext + "\n" : ""}User: ${message}`;
    const messages = [
      ...(conversationHistory ?? []),
      { role: "user", content: userContent },
    ];
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://myclinic.myenum.in",
        "X-Title": "MyClinics Ai Root",
      },
      body: JSON.stringify({ model: openrouterModel, messages, max_tokens: 1024, temperature: 0.4 }),
    });
    if (r.ok) {
      const j = await r.json();
      const reply = j.choices?.[0]?.message?.content?.trim();
      if (reply) return NextResponse.json({ reply });
    } else {
      const errText = await r.text().catch(() => "");
      console.error("OpenRouter error", r.status, errText.slice(0, 500));
    }
  } catch (e) {
    console.error("OpenRouter fetch failed", e);
  }

  // Fallback via backend proxy (backend also uses OpenRouter)
  try {
    const proxyRes = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.AI_INTERNAL_TOKEN ? { "X-Internal-Token": process.env.AI_INTERNAL_TOKEN } : {}) },
      body: JSON.stringify({ message, clinicName, role, clinicId, conversationHistory, projectContext }),
      cache: "no-store",
    });
    if (proxyRes.ok) {
      const pj = await proxyRes.json();
      if (pj.reply) return NextResponse.json({ reply: pj.reply });
    }
  } catch {}

  const ctxHint = projectContext ? ` (clinic data: ${projectContext.slice(0, 300)})` : "";
  return NextResponse.json({ reply: `Ai Root here — I checked your clinic modules${ctxHint ? " with live data" : ""}. For "${message.slice(0, 80)}", I need a bit more detail (patient name or date) to pull the exact records from appointments, prescriptions, or billing. What would you like me to look up?` });
}
