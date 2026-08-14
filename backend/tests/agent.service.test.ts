import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { extractJson, parseAgentReply, runAgent } from "@/services/ai/agent.service";
import { complete } from "@/services/ai/nvidia.service";
import type { AgentContext } from "@/lib/ai-types";

vi.mock("@/services/ai/nvidia.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/ai/nvidia.service")>();
  return { ...actual, complete: vi.fn() };
});

const mockedComplete = vi.mocked(complete);

const baseContext: AgentContext = {
  organizationId: "org-1",
  clinicName: "Green Park Clinic",
  soul: "# AI Identity\nYou are a clinic assistant.",
  fallbackReply: "I'm sorry, I couldn't find that information. Please contact the clinic for more details.",
  customerName: null,
  phoneNumber: "919876543210",
  memoryFacts: [],
  conversationSummary: null,
  history: [],
  doctors: ["Dr. Kumar", "Dr. Priya"],
  todayISO: "2026-08-12",
  workingHours: { open: "09:00", close: "18:00", slotMinutes: 30 },
  knowledgeDocs: [],
};

const validJson = JSON.stringify({
  reply: "Sure. What time would you prefer?",
  intent: "appointment_booking",
  appointment: { customerName: "Arun", doctorName: "Dr. Kumar", date: null, time: null },
  state: "collecting",
  action: null,
});

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("extractJson", () => {
  it("extracts fenced JSON", () => {
    const result = extractJson(`Here you go:\n\`\`\`json\n${validJson}\n\`\`\``);
    expect(result).toEqual(JSON.parse(validJson));
  });

  it("extracts bare JSON embedded in text", () => {
    const result = extractJson(`prefix ${validJson} suffix`);
    expect(result).toEqual(JSON.parse(validJson));
  });

  it("returns null for invalid JSON", () => {
    expect(extractJson("not json at all")).toBeNull();
    expect(extractJson("{ broken")).toBeNull();
  });
});

describe("parseAgentReply", () => {
  it("parses a valid agent reply", () => {
    const reply = parseAgentReply(validJson);
    expect(reply).not.toBeNull();
    expect(reply?.intent).toBe("appointment_booking");
    expect(reply?.state).toBe("collecting");
  });

  it("rejects malformed replies", () => {
    expect(parseAgentReply("{}")).toBeNull();
    expect(parseAgentReply(JSON.stringify({ reply: "", intent: "bogus", appointment: {}, state: "x", action: null }))).toBeNull();
  });
});

describe("runAgent", () => {
  it("builds the prompt with soul, memory and history, and parses the reply", async () => {
    mockedComplete.mockResolvedValueOnce(validJson);

    const ctx: AgentContext = {
      ...baseContext,
      memoryFacts: ["Preferred Name: Arun"],
      history: [
        { role: "user", content: "I want to see Dr Kumar tomorrow" },
        { role: "assistant", content: "What time works for you?" },
      ],
    };

    const reply = await runAgent(ctx, "5 PM");
    expect(reply.state).toBe("collecting");

    const messages = mockedComplete.mock.calls[0][0];
    expect(messages[0].role).toBe("system");
    const systemText = messages[0].content;
    expect(systemText).toContain("Preferred Name: Arun");
    expect(systemText).toContain("Dr. Kumar");
    expect(systemText).toContain("2026-08-12");
    expect(messages).toContainEqual({ role: "user", content: "5 PM" });
  });

  it("includes clinic identity and knowledge base docs in the prompt", async () => {
    mockedComplete.mockResolvedValueOnce(validJson);

    const ctx: AgentContext = {
      ...baseContext,
      knowledgeDocs: [
        { title: "Consultation fees", content: "A standard consultation fee is Rs. 500 per visit." },
      ],
    };

    await runAgent(ctx, "How much is a consultation?");
    const messages = mockedComplete.mock.calls[0][0];
    const systemText = messages[0].content;
    expect(systemText).toContain("official AI assistant for Green Park Clinic");
    expect(systemText).toContain("single source of truth");
    expect(systemText).toContain("Consultation fees");
    expect(systemText).toContain("Rs. 500 per visit");
    expect(systemText).toContain("couldn't find that information");
  });

  it("retries once when the first response is invalid JSON", async () => {
    mockedComplete
      .mockResolvedValueOnce("I am not json")
      .mockResolvedValueOnce(validJson);

    const reply = await runAgent(baseContext, "hi");
    expect(reply).not.toBeNull();
    expect(mockedComplete).toHaveBeenCalledTimes(2);
  });

  it("throws AgentParseError when both responses are invalid", async () => {
    mockedComplete.mockResolvedValue("still not json");
    await expect(runAgent(baseContext, "hi")).rejects.toThrow("unparseable");
  });
});
