import "./bootstrap-env";
import { getDb } from "@/lib/db-pools";
import { getSoul } from "@/services/ai/soul.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import {
  retrieveKnowledge,
  contentRelevance,
} from "@/services/ai/knowledge.service";
import { runAgent } from "@/services/ai/agent.service";
import { makeFallbackReply, isCurrencyGrounded } from "@/services/ai/grounding";
import {
  isGreeting,
  hasAppointmentIntent,
  hasFactualIntent,
} from "@/services/ai/intent.service";
import { todayISO } from "@/services/ai/dates";
import type { AgentContext, AgentReply } from "@/lib/ai-types";

const SOUL_RELEVANCE_MIN_SCORE = 0.15;

const MESSAGES = [
  "Hi",
  "How much is a consultation?",
  "Where is the clinic located?",
  "What are your opening hours?",
  "What is your contact number?",
  "I want an appointment tomorrow at 9 AM",
  "Do you have parking?",
  "Do you treat migraines?",
  "zxqw vbml",
];

async function main() {
  const db = await getDb();
  const org = await ensureDefaultOrganization(db);
  const soul = await getSoul(db, org.id);

  const contextBase: AgentContext = {
    organizationId: org.id,
    clinicName: org.name,
    soul: soul.content,
    fallbackReply: soul.fallbackReply,
    customerName: null,
    phoneNumber: "919876543210",
    memoryFacts: [],
    conversationSummary: null,
    history: [],
    doctors: [],
    todayISO: todayISO(),
    workingHours: org.settings,
    knowledgeDocs: [],
  };

  for (const msg of MESSAGES) {
    const trimmed = msg.trim();
    const isGreetingMsg = isGreeting(trimmed);
    const appointmentIntent = hasAppointmentIntent(trimmed);
    const factualIntent = hasFactualIntent(trimmed);
    const usesKnowledgeBase = !isGreetingMsg && (factualIntent || !appointmentIntent);

    let knowledgeDocs: { title: string; content: string }[] = [];
    if (usesKnowledgeBase) {
      const hits = await retrieveKnowledge(db, org.id, trimmed);
      knowledgeDocs = hits.map((h) => ({ title: h.title, content: h.content }));
    }

    const context: AgentContext = { ...contextBase, knowledgeDocs };

    const blockedByBoundary =
      factualIntent &&
      knowledgeDocs.length === 0 &&
      contentRelevance(trimmed, soul.content) < SOUL_RELEVANCE_MIN_SCORE;

    let reply: AgentReply;
    let llmError: string | null = null;
    try {
      reply = blockedByBoundary
        ? makeFallbackReply(soul.fallbackReply)
        : await runAgent(context, msg);
    } catch (err) {
      llmError =
        err instanceof Error ? `${err.constructor.name}: ${err.message}` : String(err);
      reply = makeFallbackReply(soul.fallbackReply);
    }

    const authorizedContextText = [
      context.soul,
      ...context.knowledgeDocs.map((d) => `${d.title}\n${d.content}`),
      ...context.doctors,
      context.workingHours
        ? `${context.workingHours.open} - ${context.workingHours.close}`
        : null,
      context.todayISO,
    ]
      .filter((s): s is string => Boolean(s))
      .join("\n");

    const grounded = isCurrencyGrounded(reply.reply, authorizedContextText);
    const sent = reply.action ? reply.reply : grounded ? reply.reply : soul.fallbackReply;

    console.log("============================================================");
    console.log(`MSG: ${msg}`);
    console.log(
      `flags: greeting=${isGreetingMsg} appointment=${appointmentIntent} factual=${factualIntent}`
    );
    console.log(
      `knowledge hits: ${knowledgeDocs.map((k) => k.title).join(", ") || "(none)"}`
    );
    console.log(`blockedByBoundary: ${blockedByBoundary}  grounded: ${grounded}`);
    console.log(`intent=${reply.intent} state=${reply.state} action=${reply.action?.action ?? null}`);
    if (llmError) console.log(`LLM ERROR: ${llmError} (sent fallback)`);
    console.log(`SENT TO CUSTOMER:`);
    console.log(sent);
    console.log("");
    await new Promise((r) => setTimeout(r, 8000));
  }
}

main()
  .catch((err) => {
    console.error("VERIFY FAILED", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
