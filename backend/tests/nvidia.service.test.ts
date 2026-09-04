import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  complete,
  NvidiaConfigError,
} from "@/services/ai/nvidia.service";

const REAL_KEY = process.env.NVIDIA_API_KEY;

beforeEach(() => {
  process.env.NVIDIA_API_KEY = "test-key";
  process.env.NVIDIA_API_URL = "https://example.invalid/chat/completions";
  process.env.NVIDIA_MODEL = "minimaxai/minimax-m3";
  process.env.NVIDIA_TIMEOUT_MS = "2000";
  vi.resetAllMocks();
});

afterEach(() => {
  if (REAL_KEY === undefined) delete process.env.NVIDIA_API_KEY;
  else process.env.NVIDIA_API_KEY = REAL_KEY;
});

function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("nvidia.service", () => {
  it("returns the model text on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse("hello from the model")));
    const text = await complete([{ role: "user", content: "hi" }]);
    expect(text).toBe("hello from the model");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws NvidiaConfigError when the API key is missing", async () => {
    delete process.env.NVIDIA_API_KEY;
    await expect(complete([{ role: "user", content: "hi" }])).rejects.toThrow(
      NvidiaConfigError
    );
  });

  it("does not retry on a 4xx error and surfaces the status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 400 }))
    );
    await expect(complete([{ role: "user", content: "hi" }])).rejects.toMatchObject({
      name: "NvidiaApiError",
      status: 400,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries once on a transient 5xx error", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(okResponse("recovered"));
    vi.stubGlobal("fetch", mock);
    const text = await complete([{ role: "user", content: "hi" }]);
    expect(text).toBe("recovered");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws after retries when the service stays down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    await expect(complete([{ role: "user", content: "hi" }])).rejects.toMatchObject({
      name: "NvidiaApiError",
      status: 500,
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("maps a timeout to a typed timeout error", async () => {
    const timeoutError = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));
    await expect(complete([{ role: "user", content: "hi" }])).rejects.toMatchObject({
      name: "NvidiaApiError",
      code: "timeout",
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("rejects an invalid response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse("")) // empty content
    );
    await expect(complete([{ role: "user", content: "hi" }])).rejects.toMatchObject({
      name: "NvidiaApiError",
      code: "invalid_response",
    });
  });
});
