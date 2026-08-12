import { describe, it, expect } from "vitest";
import {
  isGreeting,
  hasAppointmentIntent,
  hasFactualIntent,
} from "@/services/ai/intent.service";

describe("isGreeting", () => {
  it("matches common greetings", () => {
    expect(isGreeting("hi")).toBe(true);
    expect(isGreeting("Hello")).toBe(true);
    expect(isGreeting("good morning")).toBe(true);
    expect(isGreeting("Hey there")).toBe(true);
    expect(isGreeting("Namaste")).toBe(true);
  });

  it("rejects longer messages that start with a greeting", () => {
    expect(isGreeting("hi I want to book an appointment for tomorrow")).toBe(false);
  });

  it("rejects non-greetings", () => {
    expect(isGreeting("what are your opening hours")).toBe(false);
    expect(isGreeting("")).toBe(false);
  });
});

describe("hasAppointmentIntent", () => {
  it("matches booking language", () => {
    expect(hasAppointmentIntent("I want to book an appointment")).toBe(true);
    expect(hasAppointmentIntent("book a consultation tomorrow")).toBe(true);
    expect(hasAppointmentIntent("is Dr Kumar available on monday")).toBe(true);
    expect(hasAppointmentIntent("can I visit the doctor today")).toBe(true);
  });

  it("matches reschedule and cancel language", () => {
    expect(hasAppointmentIntent("I need to reschedule my appointment")).toBe(true);
    expect(hasAppointmentIntent("please cancel my booking")).toBe(true);
  });

  it("does not match pure factual questions", () => {
    expect(hasAppointmentIntent("what are your opening hours")).toBe(false);
    expect(hasAppointmentIntent("do you accept insurance")).toBe(false);
  });

  it("treats consultation phrasing as a booking signal (factual precedence still wins)", () => {
    expect(hasAppointmentIntent("book a consultation tomorrow")).toBe(true);
    expect(hasAppointmentIntent("I need a consultation")).toBe(true);
  });
});

describe("hasFactualIntent", () => {
  it("matches fact questions that should use the knowledge base", () => {
    expect(hasFactualIntent("how much is the consultation fee")).toBe(true);
    expect(hasFactualIntent("what are your opening hours")).toBe(true);
    expect(hasFactualIntent("where is the clinic located")).toBe(true);
    expect(hasFactualIntent("do you accept insurance")).toBe(true);
    expect(hasFactualIntent("what is the phone number")).toBe(true);
  });

  it("does not match booking messages", () => {
    expect(hasFactualIntent("book an appointment for tomorrow")).toBe(false);
    expect(hasFactualIntent("is Dr Kumar free on monday")).toBe(false);
  });
});
