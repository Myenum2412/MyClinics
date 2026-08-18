import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { requestMeta } from "@/clinic/core/context";
import { loginSchema, refreshSchema, signupSchema } from "@/clinic/modules/auth/auth.dto";
import { AuthService } from "@/clinic/modules/auth/auth.service";

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
}
