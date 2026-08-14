import { describe, it, expect } from "vitest";
import {
  makeFallbackReply,
  extractCurrencyAmounts,
  isCurrencyGrounded,
} from "@/services/ai/grounding";

describe("makeFallbackReply", () => {
  it("builds a structured fallback reply that never triggers an action", () => {
    const reply = makeFallbackReply("I'm sorry, I couldn't find that information.");
    expect(reply).toEqual({
      reply: "I'm sorry, I couldn't find that information.",
      intent: "none",
      appointment: {
        customerName: null,
        doctorName: null,
        date: null,
        time: null,
      },
      state: "done",
      action: null,
    });
  });
});

describe("extractCurrencyAmounts", () => {
  it("extracts Rs., ₹ and INR amounts", () => {
    expect(extractCurrencyAmounts("Fee is Rs. 500 per visit.")).toEqual(["500"]);
    expect(extractCurrencyAmounts("Costs ₹1,200 only.")).toEqual(["1200"]);
    expect(extractCurrencyAmounts("INR 400 for a video consult")).toEqual(["400"]);
  });

  it("ignores plain numbers like dates and times", () => {
    expect(extractCurrencyAmounts("See you on 12 Aug 2026 at 9 AM.")).toEqual([]);
  });
});

describe("isCurrencyGrounded", () => {
  const context =
    "A standard consultation fee is Rs. 500 per visit. " +
    "The clinic is open Monday to Saturday from 9:00 AM to 6:00 PM.";

  it("accepts amounts present in the authorized context", () => {
    expect(isCurrencyGrounded("The fee is Rs. 500.", context)).toBe(true);
  });

  it("rejects amounts invented by the model", () => {
    expect(isCurrencyGrounded("The fee is Rs. 1200.", context)).toBe(false);
  });

  it("accepts replies without any currency", () => {
    expect(isCurrencyGrounded("Please arrive 10 minutes before your appointment.", context)).toBe(true);
  });
});
