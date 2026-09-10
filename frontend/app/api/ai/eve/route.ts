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

  // Try to use real project data: fetch clinic context + forward to backend AI if available
  let projectContext = "";
  try {
    // Forward cookies for auth
    const cookie = req.headers.get("cookie") ?? "";
    // Try backend AI agent if configured
    if (process.env.AI_INTERNAL_TOKEN && clinicId) {
      const aiRes = await fetch(`${BACKEND_URL}/api/ai/context?organizationId=${encodeURIComponent(clinicId)}`, {
        headers: { "X-Internal-Token": process.env.AI_INTERNAL_TOKEN, cookie },
        cache: "no-store",
      });
      if (aiRes.ok) {
        const ctx = await aiRes.json();
        projectContext = `Clinic context: ${JSON.stringify(ctx).slice(0, 2000)}`;
      }
    }
    // Fallback: fetch clinic info via same-origin proxy if no internal token
    if (!projectContext && clinicId) {
      const clinicRes = await fetch(`${BACKEND_URL}/api/clinics/${clinicId}`, {
        headers: { cookie },
        cache: "no-store",
      }).catch(() => null);
      if (clinicRes?.ok) {
        const clinic = await clinicRes.json();
        projectContext = `Clinic: ${clinic.name ?? clinicName ?? ""} | ${JSON.stringify(clinic.settings ?? {}).slice(0, 800)}`;
      }
    }
  } catch {
    // non-blocking
  }

  // OpenRouter — Thinking Machines: Inkling — no system prompt, nurse persona via user context + project data
  const openrouterKey = process.env.OPENROUTER_API_KEY || "";
  const openrouterModel = process.env.OPENROUTER_MODEL || "thinkingmachines/inkling";
  const nurseContext = `You are Ai Root, a friendly clinic nurse assistant for ${clinicName ?? "this clinic"} (${role ?? "patient"} view). Reply as a helpful nurse: use clinic database info below, help book appointments, check doctor availability, explain records/prescriptions/billing simply. Never claim you are Inkling/Thinking Machines. Keep tone caring, concise, Tamil/English as user uses. If user says hi, greet as Ai Root nurse and ask how to help with clinic. If user asks what you do, list clinic tasks: book appointments, check queue, explain prescriptions, billing, records.`;
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
