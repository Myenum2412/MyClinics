import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limiter";
import { UnauthorizedError, ValidationError } from "@/mt/core/errors";
import { requestMeta } from "@/mt/core/tenant-context";
import { loginSchema, refreshSchema, signupSchema } from "@/mt/modules/auth/auth.dto";
import { AuthService } from "@/mt/modules/auth/auth.service";

const loginLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 10 });

export class AuthController {
  async signup(request: FastifyRequest, reply: FastifyReply) {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }
    const service = new AuthService(await getDb());
    const result = await service.signup(parsed.data);
    return reply.code(201).send(result);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const { ip, userAgent } = requestMeta(request);
    const key = `${parsed.data.email}:${ip ?? "unknown"}`;
    if (!loginLimiter.check(key)) {
      return reply.code(429).send({
        error: "Too many login attempts. Please try again later.",
        code: "TOO_MANY_ATTEMPTS",
      });
    }

    const service = new AuthService(await getDb());
    const result = await service.login(parsed.data, { ip, userAgent });
    return reply.send(result);
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError("A token is required");
    }
    const service = new AuthService(await getDb());
    const token = await service.refresh(parsed.data.token);
    return reply.send({ token });
  }

  /** Current user — the only "user" a patient is allowed to see. */
  async me(request: FastifyRequest, reply: FastifyReply) {
    const tenant = request.tenant;
    if (!tenant) throw new UnauthorizedError();
    return reply.send({
      userId: tenant.userId,
      clinicId: tenant.clinicId,
      role: tenant.role,
      name: tenant.name,
      email: tenant.email,
      patientId: tenant.patientId,
    });
  }
}