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
    const query = request.query as { from?: string };
    const from = query.from === "signup" ? "signup" : "login";
    const redirectUri = `${frontendBaseUrl(request)}${GOOGLE_CALLBACK_PATH}`;
    const state = await issueStateToken(from);
    const url = await buildAuthorizationUrl(config.clientId, redirectUri, state);
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
    try {
      const tokens = await exchangeCodeForTokens(
        config.clientId,
        config.clientSecret,
        query.code,
        redirectUri,
        stateRes.verifier
      );
      const info = await fetchGoogleUserInfo(tokens.access_token);
      if (!info.email || info.email_verified !== true) {
        return fail("google_email_unverified");
      }
      email = info.email;
      googleName = info.name;
    } catch {
      return fail("google_exchange");
    }

    try {
      const db = await getDb();
      const { ip, userAgent } = requestMeta(request);
      const result = await new AuthService(db).loginWithGoogle(email, { ip, userAgent });
      // Set httpOnly cookie and redirect without token in URL (prevents token leak in logs/referrer)
      setClinicAuthCookies(reply, result.token, result.tokenExpiresInSeconds ?? 24 * 3600);
      return reply.redirect(`${base}/clinic`);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        if (from === "signup") {
          const ticket = await issueGoogleSignupTicket(email);
          return reply.redirect(
            `${base}/signup/clinic?error=google_no_account&email=${encodeURIComponent(email)}` +
              `&name=${encodeURIComponent(googleName ?? "")}&gticket=${ticket}`
          );
        }
        return fail("google_no_account");
      }
      throw error;
    }
  }
}
