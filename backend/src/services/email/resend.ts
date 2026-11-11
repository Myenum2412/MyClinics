/**
 * Thin Resend (https://resend.com) client.
 *
 * Uses the HTTP API directly with the global `fetch`, so no extra dependency
 * is required. Configure via env:
 *
 *   RESEND_API_KEY   – API key from https://resend.com/api-keys (required)
 *   RESEND_FROM_EMAIL – verified sender, e.g. "MyClinics <hello@yourdomain.com>"
 *                       (defaults to Resend's onboarding sender for testing)
 *   RESEND_REPLY_TO   – optional Reply-To address
 *
 * Sending is best-effort: failures are logged, never thrown, so a mail outage
 * can never block a signup or any other request.
 */
import { logger } from "@/lib/logger";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "MyClinics <onboarding@resend.dev>";
const REQUEST_TIMEOUT_MS = 10_000;

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file contents. */
  content: string;
  contentType?: string;
  /** Set for inline images referenced as `cid:<contentId>` in the HTML. */
  contentId?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

let warnedMissingKey = false;

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      logger.warn("email skipped: RESEND_API_KEY is not configured", { subject: input.subject });
    }
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const replyTo = input.replyTo ?? (process.env.RESEND_REPLY_TO?.trim() || undefined);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((attachment) => ({
                filename: attachment.filename,
                content: attachment.content,
                ...(attachment.contentType ? { content_type: attachment.contentType } : {}),
                ...(attachment.contentId ? { content_id: attachment.contentId } : {}),
              })),
            }
          : {}),
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      const error = payload?.message ?? payload?.name ?? `Resend responded ${response.status}`;
      logger.error("email send failed", { status: response.status, error, subject: input.subject });
      return { ok: false, error };
    }

    logger.info("email sent", { id: payload?.id, subject: input.subject });
    return { ok: true, id: payload?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("email send failed", { error: message, subject: input.subject });
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
