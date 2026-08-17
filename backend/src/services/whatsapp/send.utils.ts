import type { Client, MessageMedia, MessageSendOptions } from "whatsapp-web.js";
import { logger } from "@/lib/logger";

const DEFAULT_SEND_TIMEOUT_MS = 20_000;

/**
 * Sends a WhatsApp message but never lets the pipeline hang: `client.sendMessage`
 * resolves only when the delivery ack arrives, so a stale web socket can stall
 * the handler indefinitely (no reply, no conversation saved). Returns whether
 * the send completed and logs failures instead of throwing.
 */
export async function sendWithTimeout(
  client: Client,
  remote: string,
  content: string | MessageMedia,
  options?: MessageSendOptions,
  timeoutMs: number = DEFAULT_SEND_TIMEOUT_MS
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      client.sendMessage(remote, content, options),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`send timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    return true;
  } catch (err) {
    logger.warn("whatsapp send failed", {
      remote,
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
