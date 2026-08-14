type Level = "info" | "warn" | "error";

function write(level: Level, message: string, fields?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    message,
  };
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      entry[key] = value;
    }
  }
  process.stdout.write(JSON.stringify(entry) + "\n");
}

const REDACTED = new Set([
  "apiKey",
  "token",
  "authorization",
  "password",
  "secret",
  "cookie",
  "sessionId",
]);

function redact(fields?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const lower = key.toLowerCase();
    safe[key] =
      REDACTED.has(lower) || lower.includes("secret") || lower.includes("token")
        ? "[redacted]"
        : value;
  }
  return safe;
}

export const logger = {
  info(message: string, fields?: Record<string, unknown>) {
    write("info", message, redact(fields));
  },
  warn(message: string, fields?: Record<string, unknown>) {
    write("warn", message, redact(fields));
  },
  error(message: string, fields?: Record<string, unknown>) {
    write("error", message, redact(fields));
  },
};
