/**
 * Guards the internal /api/ai/* endpoints used by the WhatsApp worker.
 * The worker authenticates with AI_INTERNAL_TOKEN so the AI can never reach
 * anything outside these explicitly wired routes.
 */
export function aiAuthResult(
  request: Request
): { ok: true } | { ok: false; reason: "not_configured" | "unauthorized" } {
  const configured = process.env.AI_INTERNAL_TOKEN;
  if (!configured) return { ok: false, reason: "not_configured" };
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${configured}`) return { ok: false, reason: "unauthorized" };
  return { ok: true };
}
