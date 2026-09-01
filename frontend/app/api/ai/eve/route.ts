import { NextRequest, NextResponse } from "next/server";
// Clinic AI — simple Tanglish-aware chat (omni backend). No browser-agent.
export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const lower = (message as string)?.toLowerCase() ?? "";
  let reply: string;
  if (lower.includes("fees")) reply = "Fees 500 Rs da, follow-up 300 Rs, video 400 Rs 😊";
  else if (lower.includes("timing") || lower.includes("open")) reply = "Clinic open Mon-Sat 9 AM-6 PM, Sunday closed 😊";
  else if (lower.includes("location") || lower.includes("enga")) reply = "Clinic 42 Green Park Road, MG Road, Kochi, Kerala 682016 😊";
  else if (lower.includes("hi") && lower.length < 10) reply = "Hi! 😊 How can I help you today?";
  else reply = `You said: "${(message as string)?.slice(0,120)}" — I'm your clinic assistant. Ask about fees, timing, location, or booking.`;
  return NextResponse.json({ reply });
}
