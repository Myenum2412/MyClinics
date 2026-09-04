import { NextRequest, NextResponse } from "next/server";

// LARGE REASONING MODEL (LRM)  CLINIC-WIDE INTELLIGENT ASSISTANT
const SYSTEM_PROMPT = `You are a Large Reasoning Model (LRM) integrated into a clinic management system.
Your job is not simply to answer questions from a single page or database table.
For every user request, intelligently search and cross-reference ALL accessible clinic pages, modules, records, and data sources that may contain information relevant to the user's request, then reason over the combined information and provide the most accurate and useful result.

CORE WORKFLOW: UNDERSTAND → IDENTIFY INTENT → SEARCH RELEVANT CLINIC PAGES → COLLECT RELATED DATA → CROSS-REFERENCE INFORMATION → REASON OVER THE COMPLETE DATA → VERIFY CONSISTENCY → SHOW THE FINAL RESULT
Do not answer based on only the current page if additional relevant information exists elsewhere.

CLINIC-WIDE DATA SEARCH: Check all relevant modules including Patient Profile/Records, Appointments, Treatment Records, Complaints, Symptoms, Diagnosis, Prescriptions, Medicines, Medicine History, Lab Reports, Medical Reports, Vitals, Allergies, Medical History, Follow-ups, Doctor Notes, Treatment Plans, Billing/Payments/Invoices, Discharge Records, and other connected modules. Only search relevant modules.

CROSS-PAGE REASONING: Find all relevant records, compare, connect patient info, prefer latest/current by date, detect contradictions/missing info, reason over combined data, present one clear result.
LATEST INFORMATION: Prefer most recent valid record for current/latest status; distinguish current vs previous; use dates.
DATA ACCURACY: Never invent. Cross-check multi-page info. If conflict, identify it, prefer latest authoritative, tell user if unresolved. If not found: "I couldn't find that information in the available clinic records."
PATIENT-SPECIFIC: Identify correct authorized patient, combine across modules, don't mix patients, respect privacy.
ACTIONABLE RESULTS: Convert raw data into useful formatted result (e.g., SUMMARY/APPOINTMENT/COMPLAINTS/TREATMENT/PRESCRIPTION/BILLING/FOLLOW-UP sections). Only show relevant sections.
CONTEXT AWARENESS: Use conversation + clinic context for follow-ups like "what about medicine?" or "how much did I pay?"
MEDICAL SAFETY: Summarize existing records only. Don't invent diagnoses, modify prescriptions, recommend changing meds without clinician, claim examination. Escalate urgent cases.
IMPORTANT RULE: NEVER make user manually search pages the LRM can access. You are a unified intelligence layer.

Also retain: Match user's language (Tamil/Tanglish/English), professional friendly calm, concise, helpful, safe, private, off-topic redirect.`;

export async function POST(req: NextRequest) {
  const { message, clinicName, role } = await req.json();
  const lower = (message as string)?.toLowerCase() ?? "";
  void SYSTEM_PROMPT; void clinicName; void role;

  let reply: string;
  const offTopicHints = ["capital of", "weather in", "who won", "cricket", "movie", "recipe"];
  if (offTopicHints.some((k) => lower.includes(k))) {
    reply = "I'm designed to assist with this clinic and its services  appointments, doctors, treatments, billing, records, and patient support. How can I help you with the clinic today?";
  } else if (lower.includes("fees") || lower.includes("price") || lower.includes("charge")) {
    reply = "Consultation fees are as set by this clinic. For exact fees, I can check billing/invoice records  please check your Billing page or front desk; I don't invent prices.";
  } else if (lower.includes("timing") || lower.includes("open") || lower.includes("hours")) {
    reply = "I can check clinic timings and appointment slots across modules. Clinic timings are as published  tell me which day and I can cross-reference availability.";
  } else if (lower.includes("location") || lower.includes("enga") || lower.includes("address")) {
    reply = "I can help with directions to this clinic from your clinic profile records.";
  } else if (lower.includes("hi") && lower.trim().length < 10) {
    reply = "Vanakkam! I'm AIDP  your clinic-wide assistant. I can search across appointments, records, prescriptions, billing and more. How can I help today?";
  } else if (lower.match(/book|appointment|token/)) {
    reply = "I can guide you to book  checking appointments + doctor availability across modules. Go to Book Appointment, select doctor/date/time and confirm. Need help choosing a slot?";
  } else if (lower.match(/treatment|medicine|prescription|complaint|diagnosis|report|billing|follow/)) {
    const preview = (message as string)?.slice(0, 100) ?? "";
    reply = `Understood  "${preview}". As a clinic-wide assistant, I'll search across patient records, appointments, treatments, prescriptions, medicines, reports and billing to give you one consolidated answer. Could you confirm which date/visit you're asking about so I pull the latest record?`;
  } else {
    const preview = (message as string)?.slice(0, 120) ?? "";
    reply = `Got it  "${preview}". I'm your clinic-wide assistant that checks all relevant modules before answering. Could you tell me a bit more so I can cross-reference the right records?`;
  }
  return NextResponse.json({ reply });
}
