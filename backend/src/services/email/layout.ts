/**
 * Shared branding + layout for transactional emails.
 *
 * The MyClinics wordmark is either hot-linked from the public app
 * (`<EMAIL_APP_URL>/logo-wordmark.png`) or attached inline as a CID image when
 * the app runs on localhost, so the logo displays in Gmail/Outlook either way.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "@/lib/logger";
import type { EmailAttachment } from "@/services/email/resend";

export const EMAIL_LOGO_CID = "myclinics-logo";
export const EMAIL_LOGO_FILENAME = "logo-wordmark.png";
export const EMAIL_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Base URL used for links and the hosted logo in emails. */
export function emailAppUrl(): string {
  return (
    process.env.EMAIL_APP_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://myclinic.myenum.in"
  ).replace(/\/+$/, "");
}

/**
 * Public logo URL when the app has a real hostname. Local URLs are skipped —
 * a `localhost` image would never load in the recipient's mail client.
 */
function hostedLogoUrl(): string | null {
  const explicit = process.env.EMAIL_LOGO_URL?.trim();
  if (explicit) return explicit;

  const base = emailAppUrl();
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(base)) return null;
  return `${base}/${EMAIL_LOGO_FILENAME}`;
}

/**
 * Reads the wordmark used by the web app (frontend/public). Prefers an
 * explicit EMAIL_LOGO_PATH. Returns null when unavailable so the email still
 * renders without a broken image.
 */
let logoCache: string | null | undefined;

function loadLogoBase64(): string | null {
  if (logoCache !== undefined) return logoCache;

  const candidates = [
    process.env.EMAIL_LOGO_PATH,
    join(process.cwd(), "../frontend/public", EMAIL_LOGO_FILENAME),
    join(process.cwd(), "frontend/public", EMAIL_LOGO_FILENAME),
    join(process.cwd(), "public", EMAIL_LOGO_FILENAME),
    fileURLToPath(
      new URL(`../../../../frontend/public/${EMAIL_LOGO_FILENAME}`, import.meta.url)
    ),
  ].filter((path): path is string => Boolean(path));

  for (const path of candidates) {
    try {
      logoCache = readFileSync(path).toString("base64");
      return logoCache;
    } catch {
      // try the next candidate
    }
  }

  logger.warn("email logo not found; sending without it");
  logoCache = null;
  return null;
}

export interface EmailLogo {
  src: string | null;
  attachments: EmailAttachment[];
}

export function emailLogo(): EmailLogo {
  const hosted = hostedLogoUrl();
  if (hosted) return { src: hosted, attachments: [] };

  const inline = loadLogoBase64();
  if (!inline) return { src: null, attachments: [] };
  return {
    src: `cid:${EMAIL_LOGO_CID}`,
    attachments: [
      {
        filename: EMAIL_LOGO_FILENAME,
        content: inline,
        contentType: "image/png",
        contentId: EMAIL_LOGO_CID,
      },
    ],
  };
}

/** Wraps arbitrary body HTML in the simple, single-column MyClinics shell. */
export function renderEmailShell(input: {
  bodyHtml: string;
  footerHtml?: string;
  logo: EmailLogo;
}): string {
  const header = input.logo.src
    ? `<img src="${input.logo.src}" width="168" alt="MyClinics" style="display:block;border:0;outline:none;text-decoration:none;">`
    : `<span style="font-size:22px;font-weight:700;color:#2563eb;letter-spacing:-0.5px;">MyClinics</span>`;

  const footer = input.footerHtml
    ? `<tr>
              <td style="padding:14px 28px;border-top:1px solid #e5e7eb;font-family:${EMAIL_FONT};font-size:12px;line-height:1.5;color:#94a3b8;">${input.footerHtml}</td>
            </tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f7fa;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:10px;">
            <tr>
              <td align="center" style="padding:30px 28px 0;">${header}</td>
            </tr>
            ${input.bodyHtml}
            ${footer}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
