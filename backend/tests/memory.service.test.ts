import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFakeDb } from "./helpers/fake-db";
import {
  extractFactsFromMessage,
  setMemory,
  getMemoryFacts,
  getRecentHistory,
  saveConversation,
  maybeSummarize,
} from "@/services/ai/memory.service";
import { complete } from "@/services/ai/nvidia.service";

vi.mock("@/services/ai/nvidia.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/ai/nvidia.service")>();
  return { ...actual, complete: vi.fn() };
});

const mockedComplete = vi.mocked(complete);

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("extractFactsFromMessage", () => {
  it("extracts a self-introduced name", () => {
    const facts = extractFactsFromMessage("Hi, I'm Arun.");
    expect(facts).toContainEqual({ key: "preferred_name", value: "Arun" });
  });

  it("extracts a preferred time of day", () => {
    const facts = extractFactsFromMessage("I usually prefer evening appointments.");
    expect(facts).toContainEqual({ key: "preferred_appointment_time", value: "evening" });
  });

  it("extracts a preferred doctor when a hint is present", () => {
    const facts = extractFactsFromMessage("I normally like Dr. Kumar.");
    expect(facts).toContainEqual({ key: "preferred_doctor", value: "Kumar" });
  });

  it("returns nothing for plain messages", () => {
    expect(extractFactsFromMessage("See you at 5 pm")).toEqual([]);
  });

  it("does not record a time of day without a preference hint", () => {
    expect(extractFactsFromMessage("Is evening ok?")).toEqual([]);
  });
});

describe("memory isolation", () => {
  it("keeps memory per customer", async () => {
    const { db } = createFakeDb();
    await setMemory(db, "org-1", "cust-a", "preferred_name", "Arun", "auto");
    await setMemory(db, "org-1", "cust-b", "preferred_name", "Bala", "auto");

    const factsA = await getMemoryFacts(db, "org-1", "cust-a");
    const factsB = await getMemoryFacts(db, "org-1", "cust-b");

    expect(factsA).toEqual(["Preferred Name: Arun"]);
    expect(factsB).toEqual(["Preferred Name: Bala"]);
  });

  it("keeps memory per organization", async () => {
    const { db } = createFakeDb();
    await setMemory(db, "org-1", "cust-a", "preferred_name", "Arun", "auto");
    await setMemory(db, "org-2", "cust-a", "preferred_name", "Other", "auto");

    const facts = await getMemoryFacts(db, "org-2", "cust-a");
    expect(facts).toEqual(["Preferred Name: Other"]);
  });

  it("upserts a key instead of duplicating it", async () => {
    const { db, dump } = createFakeDb();
    await setMemory(db, "org-1", "cust-a", "preferred_name", "Arun", "auto");
    await setMemory(db, "org-1", "cust-a", "preferred_name", "Arun Kumar", "auto");

    const records = dump("wa_memories");
    expect(records).toHaveLength(1);
    const facts = await getMemoryFacts(db, "org-1", "cust-a");
    expect(facts).toEqual(["Preferred Name: Arun Kumar"]);
  });
});

describe("getRecentHistory", () => {
  it("returns the last messages in chronological order with mapped roles", async () => {
    const { db } = createFakeDb();
    const base = {
      organizationId: "org-1",
      customerId: "cust-a",
      phoneNumber: "919876543210",
      whatsappMessageId: "wa-msg-1",
    };
    await saveConversation(db, {
      ...base,
      direction: "incoming",
      message: "hello",
      timestamp: new Date("2026-08-01T09:00:00Z"),
    });
    await saveConversation(db, {
      ...base,
      direction: "outgoing",
      message: "hi there",
      timestamp: new Date("2026-08-01T09:00:01Z"),
    });
    await saveConversation(db, {
      ...base,
      direction: "incoming",
      message: "bye",
      timestamp: new Date("2026-08-01T09:00:02Z"),
    });

    const history = await getRecentHistory(db, "org-1", "cust-a", 2);
    expect(history).toEqual([
      { role: "assistant", content: "hi there" },
      { role: "user", content: "bye" },
    ]);
  });
});

describe("maybeSummarize", () => {
  function seedCustomerWithMessages(count: number) {
    const conversations = Array.from({ length: count }, (_, i) => ({
      organizationId: "org-1",
      customerId: "cust-a",
      phoneNumber: "919876543210",
      direction: i % 2 === 0 ? "incoming" : "outgoing",
      message: `message ${i}`,
      timestamp: new Date(2026, 7, 1, 9, 0, i),
    }));
    return createFakeDb({
      wa_customers: [{ _id: "c1", organizationId: "org-1", customerId: "cust-a", phoneNumber: "919876543210" }],
      wa_conversations: conversations,
    });
  }

  it("does not call the model below the trigger threshold", async () => {
    const { db } = seedCustomerWithMessages(3);
    await maybeSummarize(db, "org-1", "cust-a");
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it("summarizes older messages and stores the summary on the customer", async () => {
    const { db, dump } = seedCustomerWithMessages(20);
    mockedComplete.mockResolvedValueOnce("Customer is booking a checkup with Dr Kumar.");

    await maybeSummarize(db, "org-1", "cust-a");

    expect(mockedComplete).toHaveBeenCalledTimes(1);
    const stored = dump("wa_customers").find(
      (c: { customerId?: string }) => c.customerId === "cust-a"
    );
    expect(stored?.conversationSummary).toBe("Customer is booking a checkup with Dr Kumar.");
  });

  it("swallows model failures so the conversation never blocks", async () => {
    const { db } = seedCustomerWithMessages(20);
    mockedComplete.mockRejectedValueOnce(new Error("network down"));

    await expect(maybeSummarize(db, "org-1", "cust-a")).resolves.toBeUndefined();
  });
});
