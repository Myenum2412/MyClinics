import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import {
  assignPatientSchema,
  createPatientSchema,
  updatePatientSchema,
} from "@/clinic/modules/patients/patients.dto";
import { patientToPublic } from "@/clinic/modules/patients/patients.schema";
import { PatientService } from "@/clinic/modules/patients/patients.service";

export class PatientController {
  private service(db: Db): PatientService {
    return new PatientService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createPatientSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid patient data");
    }
    const db = await getDb();
    const patient = await this.service(db).createPatient(ctx, parsed.data);
    return reply.code(201).send(patientToPublic(patient));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const query = request.query as { q?: string; doctorId?: string; status?: string };
    const { skip, limit } = parsePagination(query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listPatients(ctx, {
      q: query.q,
      doctorId: query.doctorId,
      status: query.status,
      skip,
      limit,
    });
    return reply.send({ items: result.items.map(patientToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { patientId } = request.params as { patientId: string };
    const db = await getDb();
    const patient = await this.service(db).getPatientById(ctx, patientId);
    return reply.send(patientToPublic(patient));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { patientId } = request.params as { patientId: string };
    const parsed = updatePatientSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid patient data");
    }
    const db = await getDb();
    const patient = await this.service(db).updatePatient(ctx, patientId, parsed.data);
    return reply.send(patientToPublic(patient));
  }

  async assign(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { patientId } = request.params as { patientId: string };
    const parsed = assignPatientSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError("doctorId is required");
    }
    const db = await getDb();
    const patient = await this.service(db).assignPatient(ctx, patientId, parsed.data);
    return reply.send(patientToPublic(patient));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { patientId } = request.params as { patientId: string };
    const db = await getDb();
    await this.service(db).deletePatient(ctx, patientId);
    return reply.send({ ok: true });
  }

  async resendCredentials(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { patientId } = request.params as { patientId: string };
    const db = await getDb();
    const result = await this.service(db).resendCredentials(ctx, patientId);
    return reply.send(result);
  }

  async sendWelcome(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { patientId } = request.params as { patientId: string };
    const body = request.body as { sendCredentials?: boolean; password?: string | null };
    const db = await getDb();
    await this.service(db).sendWelcomeMessage(ctx, patientId, {
      sendCredentials: body.sendCredentials ?? false,
      password: body.password ?? null,
    });
    return reply.send({ ok: true });
  }

  async getSelf(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) {
      return reply.send(null);
    }
    const db = await getDb();
    const patient = await this.service(db).getPatientById(ctx, ctx.patientId);
    return reply.send(patientToPublic(patient));
  }
}