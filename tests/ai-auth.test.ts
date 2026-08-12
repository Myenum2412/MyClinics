import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { aiAuthResult } from "@/services/ai/ai-auth";

const REAL_TOKEN = process.env.AI_INTERNAL_TOKEN;

beforeEach(() => {
  process.env.AI_INTERNAL_TOKEN = "secret-token";
});

afterEach(() => {
  if (REAL_TOKEN === undefined) delete process.env.AI_INTERNAL_TOKEN;
  else process.env.AI_INTERNAL_TOKEN = REAL_TOKEN;
});

describe("aiAuthResult", () => {
  it("rejects requests when no token is configured", () => {
    delete process.env.AI_INTERNAL_TOKEN;
    expect(aiAuthResult(new Request("http://local/api/ai/context"))).toEqual({
      ok: false,
      reason: "not_configured",
    });
  });

  it("accepts requests with the correct bearer token", () => {
    const request = new Request("http://local/api/ai/context", {
      headers: { authorization: "Bearer secret-token" },
    });
    expect(aiAuthResult(request)).toEqual({ ok: true });
  });

  it("rejects a wrong bearer token", () => {
    const request = new Request("http://local/api/ai/context", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(aiAuthResult(request)).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("rejects requests with no authorization header", () => {
    expect(aiAuthResult(new Request("http://local/api/ai/context"))).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });
});
