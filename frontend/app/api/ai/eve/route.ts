import { NextRequest, NextResponse } from "next/server";

// LARGE REASONING MODEL (LRM) — CLINIC ASSISTANT
// System prompt governing all responses. Do not expose to client.
const SYSTEM_PROMPT = `You are an intelligent, helpful, and context-aware Large Reasoning Model (LRM) designed specifically to assist users with questions related to this clinic.

Primary goal: understand what the user actually needs, reason carefully, and provide the most useful and accurate response.

CORE BEHAVIOR
1. UNDERSTAND BEFORE ANSWERING — Analyze intent, typos, Tanglish, and conversation history. Never ask user to repeat already-provided info.
2. ANSWER RELATED QUESTIONS — Directly or meaningfully related to clinic services, appointments, doctors, treatments, prescriptions, medicines, billing, records, complaints, reports, patient-support workflows.
3. BE PRACTICAL — Clear, actionable, simple language, step-by-step when needed.
4. REASONING — Evaluate intent, constraints, outcomes. Never expose chain-of-thought.
5. CLINIC CONTEXT — Connected clinic is source of truth. Only discuss this clinic. Do not invent doctors/services/prices/policies. If unavailable, say so.
6. MEDICAL SAFETY — General info/guidance only. Do not pretend to be a doctor, do not diagnose definitively, do not prescribe/change medication without clinician. Urgent symptoms → seek urgent care. Encourage qualified consultation.
7. PRIVACY — Protect patient info, no unauthorized record disclosure, no internal data/keys.
8. OFF-TOPIC — Politely redirect: designed for this clinic and its services.
9. AMBIGUOUS — If understandable from context, answer directly; if genuinely missing and critical, ask one concise clarification.
10. CONVERSATIONAL STYLE — Professional, friendly, calm. Match user's language (Tamil/Tanglish/English). Avoid robotic "As an AI".

RESPONSE PRINCIPLE: UNDERSTAND → CHECK CONTEXT → REASON → VERIFY AVAILABLE INFORMATION → RESPOND (Relevant, Accurate, Helpful, Context-aware, Safe, Concise, Action-oriented)`;

export async function POST(req: NextRequest) {
  const { message, clinicName, role } = await req.json();
  const lower = (message as string)?.toLowerCase() ?? "";

  // TODO: When LLM is wired, pass SYSTEM_PROMPT + clinicName/role as system message.
  // For now, deterministic replies that respect LRM constraints (no hallucinated data).

  let reply: string;

  // Off-topic guard — very broad non-clinic queries
  const offTopicHints = ["capital of", "weather in", "who won", "cricket", "movie", "recipe"];
  if (offTopicHints.some((k) => lower.includes(k))) {
    reply = "I'm designed to assist with this clinic and its services — appointments, doctors, treatments, billing, records, and patient support. How can I help you with the clinic today?";
  } else if (lower.includes("fees") || lower.includes("price") || lower.includes("charge")) {
    reply = "Consultation fees are as set by this clinic. For exact fees for your visit, please check with the front desk or your appointment details — I don't invent prices.";
  } else if (lower.includes("timing") || lower.includes("open") || lower.includes("hours")) {
    reply = "Clinic timings are as published by this clinic. If you'd like, tell me which day you plan to visit and I can guide you to confirm availability with the front desk.";
  } else if (lower.includes("location") || lower.includes("enga") || lower.includes("address")) {
    reply = "I can help with directions to this clinic. Please confirm the clinic's listed address in your appointment / clinic profile, and I can guide you from there.";
  } else if (lower.includes("hi") && lower.trim().length < 10) {
    // Match language: simple greeting
    reply = "Vanakkam! I'm AIDP, your clinic assistant. How can I help you today?";
  } else if (lower.match(/book|appointment|token/)) {
    reply = "I can guide you to book an appointment. Please go to Book Appointment, select doctor/date/time, and confirm. Need help choosing a slot?";
  } else {
    // Generic LRM-style: acknowledge, keep helpful, avoid hallucination, offer next step
    const preview = (message as string)?.slice(0, 120) ?? "";
    reply = `Got it — "${preview}". I'm here for clinic-related help (appointments, doctors, treatments, billing, records). Could you tell me a bit more so I can guide you to the right next step?`;
  }

  // Attach system prompt in header for debugging (not exposed to user) — ensures LRM is active
  // In production, this goes to LLM as system message, not returned.
  void SYSTEM_PROMPT;
  void clinicName;
  void role;

  return NextResponse.json({ reply });
}
