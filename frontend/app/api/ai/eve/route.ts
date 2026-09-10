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

  // Direct NVIDIA NIM — no system prompt, just project data + user message
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const nvidiaModel = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";
  if (nvidiaKey) {
    try {
      const userContent = projectContext ? `${projectContext}\n\nUser: ${message}` : message;
      const messages = [
        ...(conversationHistory ?? []),
        { role: "user", content: userContent },
      ];
      const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${nvidiaKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: nvidiaModel, messages, max_tokens: 1024, temperature: 0.4 }),
      });
      if (r.ok) {
        const j = await r.json();
        const reply = j.choices?.[0]?.message?.content?.trim();
        if (reply) return NextResponse.json({ reply });
      } else {
        const errText = await r.text().catch(() => "");
        console.error("NIM error", r.status, errText.slice(0, 500));
      }
    } catch (e) {
      console.error("NIM fetch failed", e);
    }
  } else {
    console.warn("NVIDIA_API_KEY not set — NIM call skipped");
  }

  // No canned fallback — if NIM failed, return honest error so it never looks like "Got it — what will you do"
  return NextResponse.json(
    { reply: "Ai Root is temporarily unable to reach the AI service (NIM). Please retry — check that NVIDIA_API_KEY is set and the dev server was restarted after adding frontend/.env.local." },
    { status: 503 }
  );
}
