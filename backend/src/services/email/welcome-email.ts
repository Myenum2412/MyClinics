/**
 * Welcome email sent when a new clinic owner signs up.
 *
 * Simple, single-column layout with the MyClinics logo (see `layout.ts`).
 * Sending is best-effort — see `resend.ts`.
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

interface WelcomeQuote {
  text: string;
  author: string;
}

const WELCOME_QUOTES: WelcomeQuote[] = [
  { text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi" },
  { text: "To keep the body in good health is a duty… otherwise we shall not be able to keep our mind strong and clear.", author: "Buddha" },
  { text: "The greatest wealth is health.", author: "Virgil" },
  { text: "Caring for others is the best medicine for the soul.", author: "Unknown" },
  { text: "Wherever the art of medicine is loved, there is also a love of humanity.", author: "Hippocrates" },
  { text: "The good physician treats the disease; the great physician treats the patient who has the disease.", author: "William Osler" },
  { text: "Start by doing what's necessary; then do what's possible; and suddenly you are doing the impossible.", author: "Francis of Assisi" },
];

export function pickWelcomeQuote(): WelcomeQuote {
  return WELCOME_QUOTES[Math.floor(Math.random() * WELCOME_QUOTES.length)];
}

export interface SignupWelcomeEmailInput {
  to: string;
  /** Clinic owner / admin name. */
  name: string;
  clinicName: string;
}

export function renderSignupWelcomeEmail(input: SignupWelcomeEmailInput): {
  subject: string;
  html: string;
  text: string;
  attachments: EmailAttachment[];
} {
  const firstName = (input.name || "there").split(" ")[0];
  const safeName = escapeHtml(firstName);
  const safeClinic = escapeHtml(input.clinicName);
  const quote = pickWelcomeQuote();
  const appUrl = emailAppUrl();
  const logo = emailLogo();

  const subject = `Welcome to MyClinics, ${firstName}!`;

  const text = [
    `Hi ${firstName},`,
    "",
    `Welcome to MyClinics! Your clinic "${input.clinicName}" is ready.`,
    "",
    `"${quote.text}" — ${quote.author}`,
    "",
    `Open your dashboard: ${appUrl}`,
    "",
    "Warm regards,",
    "The MyClinics Team",
  ].join("\n");

  const bodyHtml = `<tr>
              <td style="padding:24px 28px 0;font-family:${EMAIL_FONT};font-size:16px;line-height:1.6;color:#1f2937;">
                <p style="margin:0 0 14px;">Hi ${safeName},</p>
                <p style="margin:0;">Welcome to MyClinics! Your clinic <strong>${safeClinic}</strong> is ready.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 0;font-family:${EMAIL_FONT};">
                <p style="margin:0;padding:18px 20px;background:#f1f5f9;border-radius:8px;font-size:15px;line-height:1.6;font-style:italic;color:#334155;">
                  &ldquo;${escapeHtml(quote.text)}&rdquo;
                  <span style="display:block;margin-top:8px;font-size:13px;font-style:normal;color:#64748b;">— ${escapeHtml(quote.author)}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 0;font-family:${EMAIL_FONT};font-size:15px;">
                <a href="${escapeHtml(appUrl)}" style="color:#2563eb;font-weight:600;text-decoration:none;">Open your dashboard &rarr;</a>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 30px;font-family:${EMAIL_FONT};font-size:15px;line-height:1.6;color:#1f2937;">
                <p style="margin:0;">Warm regards,<br>The MyClinics Team</p>
              </td>
            </tr>`;

  const html = renderEmailShell({
    logo,
    bodyHtml,
    footerHtml: `You received this email because an account was created for ${safeClinic} on MyClinics.`,
  });

  return { subject, html, text, attachments: logo.attachments };
}

/**
 * Sends the signup welcome email. Never throws — safe to fire-and-forget.
 */
export async function sendSignupWelcomeEmail(input: SignupWelcomeEmailInput): Promise<boolean> {
  const to = input.to?.trim();
  if (!to) return false;
  const { subject, html, text, attachments } = renderSignupWelcomeEmail(input);
  const result = await sendEmail({ to, subject, html, text, attachments });
  if (!result.ok) {
    logger.warn("signup welcome email not delivered", { to, error: result.error });
  }
  return result.ok;
}
