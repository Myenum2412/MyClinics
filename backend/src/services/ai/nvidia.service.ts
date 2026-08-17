import { logger } from "@/lib/logger";

export class NvidiaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NvidiaConfigError";
  }
}

export class NvidiaApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "NvidiaApiError";
    this.status = status;
    this.code = code;
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

const MAX_ATTEMPTS = 2;
const DEFAULT_TIMEOUT_MS = 30_000;

interface NvidiaConfig {
  apiKey: string;
  url: string;
  model: string;
  fallbacks: string[];
  timeoutMs: number;
}

function getConfig(): NvidiaConfig {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new NvidiaConfigError(
      "NVIDIA_API_KEY is not configured. Set it in .env.local and restart the server."
    );
  }
  const fallbacks = (process.env.NVIDIA_MODEL_FALLBACKS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return {
    apiKey,
    url:
      process.env.NVIDIA_API_URL ??
      "https://integrate.api.nvidia.com/v1/chat/completions",
    model: process.env.NVIDIA_MODEL ?? "minimaxai/minimax-m3",
    fallbacks,
    timeoutMs: Number(process.env.NVIDIA_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
  };
}

function extractContent(data: unknown): string {
  const choices = (data as { choices?: { message?: { content?: unknown } }[] })
    ?.choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new NvidiaApiError(
      "NVIDIA API returned an invalid response",
      200,
      "invalid_response"
    );
  }
  return content;
}

async function requestOnce(
  config: NvidiaConfig,
  messages: ChatMessage[],
  options: CompleteOptions
): Promise<string> {
  const signal = AbortSignal.timeout(config.timeoutMs);
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      Connection: "close",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: options.temperature ?? 1,
      top_p: options.topP ?? 0.95,
      max_tokens: options.maxTokens ?? 8192,
      stream: false,
      messages,
    }),
    signal,
  });

  if (!res.ok) {
    throw new NvidiaApiError(`NVIDIA API error (${res.status})`, res.status);
  }
  return extractContent(await res.json());
}

/**
 * Sends messages to the NVIDIA chat completions API.
 * - Reads credentials/URL/models from environment variables (never hardcoded).
 * - Applies a timeout and retries once on transient 429/5xx responses.
 * - Falls back to `NVIDIA_MODEL_FALLBACKS` (comma-separated) when the primary
 *   model keeps failing, so the AI still answers while a model is rate-limited.
 * - Maps failures to typed errors; the API key is never included in errors/logs.
 */
export async function complete(
  messages: ChatMessage[],
  options: CompleteOptions = {}
): Promise<string> {
  const config = getConfig();
  const models = [config.model, ...config.fallbacks];
  let lastError: NvidiaApiError | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await requestOnce({ ...config, model }, messages, options);
      } catch (err) {
        const timedOut =
          err instanceof Error &&
          (err.name === "TimeoutError" || err.name === "AbortError");

        if (timedOut) {
          throw new NvidiaApiError(
            "NVIDIA request timed out",
            undefined,
            "timeout"
          );
        }

        if (err instanceof NvidiaApiError) {
          lastError = err;
          const retriable =
            err.status === 429 || (err.status !== undefined && err.status >= 500);

          if (!retriable) {
            throw err;
          }
          if (attempt < MAX_ATTEMPTS) {
            logger.warn("nvidia request failed, retrying", {
              model,
              attempt,
              status: err.status,
            });
            continue;
          }
        } else {
          logger.warn("nvidia request failed (network)", { model, attempt });
        }
      }
    }

    if (config.fallbacks.length > 0) {
      logger.warn("nvidia model failed, trying fallback", {
        model,
        fallbacks: config.fallbacks,
      });
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new NvidiaApiError(
    "NVIDIA request failed after retries",
    undefined,
    "retries_exhausted"
  );
}

const DEFAULT_EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const DEFAULT_EMBED_MODEL = "snowflake/arctic-embed-l";

// Circuit breaker: when the embeddings endpoint keeps failing (e.g. the model
// does not exist for this key), stop calling it for EMBED_BREAKER_COOLDOWN_MS
// after EMBED_BREAKER_THRESHOLD consecutive failures. Retrieval already
// degrades to keyword matching when embeddings return null.
const EMBED_BREAKER_THRESHOLD = 3;
const EMBED_BREAKER_COOLDOWN_MS = 10 * 60_000;
let embedFailures = 0;
let embedCooldownUntil = 0;

/**
 * Embeds a text with the NVIDIA embeddings API.
 * Returns null when the API key is missing or the request fails, so callers
 * (knowledge-base retrieval) can degrade to keyword matching instead of failing.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  if (embedCooldownUntil > Date.now()) return null;

  const url = process.env.NVIDIA_EMBED_URL ?? DEFAULT_EMBED_URL;
  const model = process.env.NVIDIA_EMBED_MODEL ?? DEFAULT_EMBED_MODEL;

  const signal = AbortSignal.timeout(15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Connection: "close",
      },
      body: JSON.stringify({ model, input: text }),
      signal,
    });
    if (!res.ok) {
      embedFailures += 1;
      if (embedFailures >= EMBED_BREAKER_THRESHOLD) {
        embedCooldownUntil = Date.now() + EMBED_BREAKER_COOLDOWN_MS;
        logger.warn("nvidia embed circuit opened", { status: res.status });
      }
      return null;
    }
    embedFailures = 0;
    const data = (await res.json()) as {
      data?: { embedding?: unknown }[];
    };
    const embedding = data.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) return null;
    return embedding as number[];
  } catch {
    embedFailures += 1;
    if (embedFailures >= EMBED_BREAKER_THRESHOLD) {
      embedCooldownUntil = Date.now() + EMBED_BREAKER_COOLDOWN_MS;
      logger.warn("nvidia embed circuit opened (network)");
    }
    return null;
  }
}
