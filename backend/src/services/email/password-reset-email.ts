/**
 * Password reset email — the ONLY delivery channel for forgot-password.
 * Never sent over WhatsApp/SMS.
 */
import { logger } from "@/lib/logger";
import { sendEmail, type EmailAttachment } from "@/services/email/resend";
import {
  EMAIL_FONT,
  emailAppUrl,
  emailLogo,
  escapeHtml,
  renderEmailShell,
} from "@/services/email/layout";

export interface PasswordResetEmailInput {
  to: string;
  name: string;
  token: string;
}

export function passwordResetUrl(token: string): string {
  return `${emailAppUrl()}/forgot-password?token=${encodeURIComponent(token)}`;
}

export function renderPasswordResetEmail(input: PasswordResetEmailInput): {
  subject: string;
  html: string;
  text: string;
  attachments: EmailAttachment[];
} {
  const firstName = (input.name || "there").split(" ")[0];
  const safeName = escapeHtml(firstName);
  const resetUrl = passwordResetUrl(input.token);
  const safeUrl = escapeHtml(resetUrl);
  const logo = emailLogo();

  const subject = "Reset your MyClinics password";

  const text = [
    `Hi ${firstName},`,
    "",
    "We received a request to reset the password for your MyClinics account.",
    "",
    "Open this email in a mail app that supports buttons and tap \"Reset password\".",
    "",
    "This link expires in 30 minutes and can be used only once.",
    "If you didn't request a password reset, you can safely ignore this email — your password will stay the same.",
    "",
    "— The MyClinics Team",
  ].join("\n");
  const bodyHtml = `<tr>
              <td style="padding:24px 28px 0;font-family:${EMAIL_FONT};font-size:16px;line-height:1.6;color:#1f2937;">
                <p style="margin:0 0 14px;">Hi ${safeName},</p>
                <p style="margin:0;">We received a request to reset the password for your MyClinics account.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 0;font-family:${EMAIL_FONT};font-size:15px;">
                <a href="${safeUrl}" style="display:inline-block;padding:12px 22px;background:#2563eb;border-radius:8px;color:#ffffff;font-weight:600;text-decoration:none;">Reset password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 30px;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:#64748b;">
                <p style="margin:0 0 10px;">This link expires in <strong>30 minutes</strong> and can be used only once.</p>
                <p style="margin:0;">If you didn't request a password reset, you can safely ignore this email — your password will stay the same.</p>
              </td>
            </tr>`;

  const html = renderEmailShell({
    logo,
    bodyHtml,
    footerHtml: "For your security, never share this link with anyone.",
  });

  return { subject, html, text, attachments: logo.attachments };
}

/** Sends the reset link. Never throws — safe to fire-and-forget. */
export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput
): Promise<boolean> {
  const to = input.to?.trim();
  if (!to) return false;
  const { subject, html, text, attachments } = renderPasswordResetEmail({ ...input, to });
  const result = await sendEmail({ to, subject, html, text, attachments });
  if (!result.ok) {
    logger.warn("password reset email not delivered", { to, error: result.error });
  }
  return result.ok;
}
