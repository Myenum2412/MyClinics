import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { requestMeta } from "@/clinic/core/context";
import {
  googleSignupSchema,
  loginSchema,
  refreshSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/clinic/modules/auth/auth.dto";
import { AuthService } from "@/clinic/modules/auth/auth.service";
import {
  buildAuthorizationUrl,
  consumeGoogleSignupTicket,
  consumeStateWithVerifier,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  frontendBaseUrl,
  googleConfig,
  issueGoogleSignupTicket,
  issueStateToken,
} from "@/clinic/modules/auth/google-oauth";
import { clearClinicAuthCookies, setClinicAuthCookies } from "@/clinic/core/cookies";
import { accessTokenTtlSeconds } from "@/clinic/core/jwt";

const GOOGLE_CALLBACK_PATH = "/api/clinics/auth/google/callback";

export class AuthController {
  async signup(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid signup data");
    }
    const db = await getDb();
    const result = await new AuthService(db).signup(parsed.data);
    setClinicAuthCookies(reply, result.token, result.tokenExpiresInSeconds);
    // Return token in body for backward-compat (frontend will ignore and rely on httpOnly cookie)
    return reply.code(201).send(result);
  }

  /**
   * Google-native signup: creates a passwordless clinic admin. The body
   * carries a one-time ticket minted by the OAuth callback for the user's
   * verified Google email — no ticket, no account.
   */
  async googleSignup(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = googleSignupSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid signup data");
    }
    const email = await consumeGoogleSignupTicket(parsed.data.gticket);
    if (!email) {
      throw new BadRequestError(
        "Your Google sign-in session expired — please click Continue with Google again"
      );
    }
    const db = await getDb();
    const result = await new AuthService(db).signupWithGoogle({
      clinicName: parsed.data.clinicName,
      adminName: parsed.data.adminName,
      email,
    });
    setClinicAuthCookies(reply, result.token, result.tokenExpiresInSeconds);
    return reply.code(201).send(result);
  }

  /**
   * POST /api/clinics/auth/forgot-password — emails a single-use reset link.
   * The response is always generic so it can't reveal registered emails.
   */
  async forgotPassword(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? "Enter your email or phone / WhatsApp number"
      );
    }
    const db = await getDb();
    const { ip, userAgent } = requestMeta(request);
    await new AuthService(db).requestPasswordReset({
      email: parsed.data.email,
      identifier: parsed.data.identifier,
      ip,
      userAgent,
    });
    return reply.send({
      ok: true,
      message:
        "If an account exists for those details, we've sent a password reset link to the email on file.",
    });
  }

  /** POST /api/clinics/auth/reset-password — sets a new password from the emailed token. */
  async resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid reset data");
    }
    const db = await getDb();
    const result = await new AuthService(db).resetPassword(parsed.data);
    return reply.send(result);
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid login data");
    }
    const db = await getDb();
    const { ip, userAgent } = requestMeta(request);
    const result = await new AuthService(db).login(parsed.data, { ip, userAgent });
    setClinicAuthCookies(reply, result.token, result.tokenExpiresInSeconds);
    return reply.send(result);
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    // Accept token from body (legacy) or from httpOnly cookie (new). Prefer cookie.
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.clinic_token;
    const bodyToken = (request.body as { token?: string } | null)?.token;
    const raw = cookieToken ?? bodyToken;
    if (!raw) throw new BadRequestError("Token is required");
    const db = await getDb();
    const { token, tokenExpiresInSeconds } = await new AuthService(db).refresh(raw);
    setClinicAuthCookies(reply, token, tokenExpiresInSeconds);
    return reply.send({ token, tokenExpiresInSeconds });
  }

  async me(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    return reply.send({
      userId: ctx.userId,
      clinicId: ctx.clinicId,
      role: ctx.role,
      name: ctx.name,
      email: ctx.email,
      doctorId: ctx.doctorId,
      patientId: ctx.patientId,
    });
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (ctx?.tokenId) {
      const { revokeJti } = await import("@/clinic/core/revocation");
      // Revoke until original expiry (use TTL from jwt if available)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // fallback 24h
      await revokeJti(ctx.tokenId, expiresAt);
    }
    clearClinicAuthCookies(reply);
    return reply.send({ ok: true });
  }

  /** Starts Google OAuth: redirects the browser to Google's consent screen. */
  async googleLogin(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const config = googleConfig();
    if (!config) {
      return reply.redirect(`${frontendBaseUrl(request)}/login?error=google_unavailable`);
    }
    const query = request.query as { from?: string; login_hint?: string; email?: string };
    const from =
      query.from === "signup"
        ? "signup"
        : query.from === "google_business"
        ? "google_business"
        : "login";
    const redirectUri = `${frontendBaseUrl(request)}${GOOGLE_CALLBACK_PATH}`;
    const state = await issueStateToken(from);
    const scope =
      from === "google_business"
        ? "openid email profile https://www.googleapis.com/auth/business.manage"
        : "openid email profile";
    const loginHint = query.login_hint || query.email;
    const url = await buildAuthorizationUrl(config.clientId, redirectUri, state, {
      scope,
      loginHint,
    });
    return reply.redirect(url);
  }

  /** Google redirects back here with `?code=...&state=...`. */
  async googleCallback(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const base = frontendBaseUrl(request);
    const fail = (error: string) => reply.redirect(`${base}/login?error=${error}`);

    const config = googleConfig();
    if (!config) return fail("google_unavailable");

    const query = request.query as { code?: string; state?: string; error?: string };
    if (query.error) return fail("google_denied");
    if (typeof query.code !== "string" || !query.code) return fail("google_callback");
    const stateRes = typeof query.state === "string" ? await consumeStateWithVerifier(query.state) : null;
    if (!stateRes) return fail("google_state");
    const from = stateRes.from;

    const redirectUri = `${base}${GOOGLE_CALLBACK_PATH}`;
    let email: string;
    let googleName: string | undefined;
    let accessToken: string | undefined;
    try {
      const tokens = await exchangeCodeForTokens(
        config.clientId,
        config.clientSecret,
        query.code,
        redirectUri,
        stateRes.verifier
      );
      accessToken = tokens.access_token;
      const info = await fetchGoogleUserInfo(tokens.access_token);
      if (!info.email || info.email_verified !== true) {
        return fail("google_email_unverified");
      }
      email = info.email;
      googleName = info.name;
    } catch {
      return fail("google_exchange");
    }

    // Special flow: connecting Google Business Profile for clinic account
    if (from === "google_business") {
      const businesses: Array<{
        id?: string;
        name: string;
        email: string;
        phone?: string;
        website?: string;
        addressLine1?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        url?: string;
      }> = [];

      if (accessToken) {
        try {
          const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(6000),
          });
          if (accRes.ok) {
            const accData = (await accRes.json()) as { accounts?: Array<{ name: string }> };
            const accounts = accData.accounts || [];
            for (const acc of accounts) {
              const locRes = await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,regularHours`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                  signal: AbortSignal.timeout(6000),
                }
              );
              if (locRes.ok) {
                const locData = (await locRes.json()) as {
                  locations?: Array<{
                    name: string;
                    title?: string;
                    storefrontAddress?: {
                      addressLines?: string[];
                      locality?: string;
                      administrativeArea?: string;
                      postalCode?: string;
                      regionCode?: string;
                    };
                    phoneNumbers?: { primaryPhone?: string };
                    websiteUri?: string;
                  }>;
                };
                for (const loc of locData.locations || []) {
                  businesses.push({
                    id: loc.name,
                    name: loc.title || "Clinic",
                    email,
                    phone: loc.phoneNumbers?.primaryPhone,
                    website: loc.websiteUri,
                    addressLine1: loc.storefrontAddress?.addressLines?.join(", "),
                    city: loc.storefrontAddress?.locality,
                    state: loc.storefrontAddress?.administrativeArea,
                    pincode: loc.storefrontAddress?.postalCode,
                    country: loc.storefrontAddress?.regionCode || "India",
                    url: "https://business.google.com/",
                  });
                }
              }
            }
          }
        } catch (err) {
          request.log?.warn?.(err, "Failed querying Google Business Profile API");
        }
      }

      return reply.type("text/html").send(`
        <!DOCTYPE html>
        <html>
          <head><title>Google Account Connected</title></head>
          <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
            <div style="text-align: center; padding: 24px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); max-width: 400px;">
              <h3 style="margin-top: 0; color: #1e293b;">Google Account Verified</h3>
              <p style="color: #64748b; font-size: 14px;">Connected ${email}. Closing...</p>
              <script>
                const payload = {
                  type: "GOOGLE_BUSINESS_AUTH_SUCCESS",
                  email: ${JSON.stringify(email)},
                  googleName: ${JSON.stringify(googleName || "")},
                  businesses: ${JSON.stringify(businesses)},
                };
                if (window.opener) {
                  window.opener.postMessage(payload, "*");
                  setTimeout(() => window.close(), 500);
                } else {
                  window.location.href = "/clinic/account";
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }

    try {
      const db = await getDb();
      const { ip, userAgent } = requestMeta(request);
      const result = await new AuthService(db).loginWithGoogle(email, { ip, userAgent });
      // Set httpOnly cookie (Lax) and also include token in URL for backward compat
      // Token in URL is short-lived and helps local dev where cookie domain may differ;
      // frontend will prefer httpOnly cookie and ignore URL after first use.
      setClinicAuthCookies(reply, result.token, result.tokenExpiresInSeconds ?? 24 * 3600);
      const expires = result.tokenExpiresInSeconds ?? 24 * 3600;
      return reply.redirect(
        `${base}/login?google_token=${encodeURIComponent(result.token)}&google_expires=${expires}`
      );
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        if (from === "signup") {
          const ticket = issueGoogleSignupTicket(email);
          return reply.redirect(
            `${base}/signup/clinic?error=google_no_account&email=${encodeURIComponent(email)}` +
              `&name=${encodeURIComponent(googleName ?? "")}&gticket=${ticket}`
          );
        }
        return fail("google_no_account");
      }
      request.log?.error?.(error);
      return fail("google_exchange");
    }
  }
}
