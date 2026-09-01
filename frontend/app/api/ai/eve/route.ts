import { NextRequest, NextResponse } from "next/server";
// Simple proxy to existing clinic AI (soul + omni) — Eve instructions in agent/instructions.md
export async function POST(req: NextRequest) {
  const { message } = await req.json();
  // For now, echo with Tanglish-aware mock; replace with real Eve defineAgent run when ANTHROPIC_API_KEY set
  const reply = message?.toLowerCase().includes("fees") ? "Fees 500 Rs da, follow-up 300 Rs 😊" : message?.toLowerCase().includes("goto") || message?.toLowerCase().includes("snapshot") ? "Browser tool ready: use browser_goto -> browser_snapshot -> browser_click/type. (Install: npx shadcn add @agentcn/eve/browser-agent)" : `Eve received: "${message?.slice(0,120)}" — I'm your clinic browser agent (model: anthropic/claude-sonnet-4-6 in agent/agent.ts). Tell me what page to open.`;
  return NextResponse.json({ reply });
}
