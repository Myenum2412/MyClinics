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
  consumeStateToken,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  frontendBaseUrl,
  googleConfig,
  issueGoogleSignupTicket,
  issueStateToken,
} from "@/clinic/modules/auth/google-oauth";

const GOOGLE_CALLBACK_PATH = "/api/clinics/auth/google/callback";

export class AuthController {
  async signup(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid signup data");
    }
    const db = await getDb();
    const result = await new AuthService(db).signup(parsed.data);
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
    const email = consumeGoogleSignupTicket(parsed.data.gticket);
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
    return reply.send(result);
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError("Token is required");
    }
    const db = await getDb();
    const token = await new AuthService(db).refresh(parsed.data.token);
    return reply.send({ token, tokenExpiresInSeconds: undefined });
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

  /** Starts Google OAuth: redirects the browser to Google's consent screen. */
  async googleLogin(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const config = googleConfig();
    if (!config) {
      return reply.redirect(`${frontendBaseUrl(request)}/login?error=google_unavailable`);
    }
    const query = request.query as { from?: string };
    const from = query.from === "signup" ? "signup" : "login";
    const redirectUri = `${frontendBaseUrl(request)}${GOOGLE_CALLBACK_PATH}`;
    return reply.redirect(
      buildAuthorizationUrl(config.clientId, redirectUri, issueStateToken(from))
    );
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
    const from = typeof query.state === "string" ? consumeStateToken(query.state) : null;
    if (!from) return fail("google_state");

    const redirectUri = `${base}${GOOGLE_CALLBACK_PATH}`;
    let email: string;
    let googleName: string | undefined;
    try {
      const tokens = await exchangeCodeForTokens(
        config.clientId,
        config.clientSecret,
        query.code,
        redirectUri
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
      throw error;
    }
  }
}
