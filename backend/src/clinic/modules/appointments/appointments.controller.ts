import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import {
  appointmentSchema,
  listAppointmentsSchema,
  updateAppointmentSchema,
} from "@/clinic/modules/appointments/appointments.dto";
import { appointmentToPublic } from "@/clinic/modules/appointments/appointments.schema";
import { AppointmentService } from "@/clinic/modules/appointments/appointments.service";

export class AppointmentController {
  private service(db: Db): AppointmentService {
    return new AppointmentService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = appointmentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid appointment data");
    }
    const db = await getDb();
    const appointment = await this.service(db).createAppointment(ctx, parsed.data);
    return reply.code(201).send(appointmentToPublic(appointment));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listAppointmentsSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listAppointments(ctx, {
      ...parsed.data,
      skip,
      limit,
    });
    return reply.send({
      items: result.items.map(appointmentToPublic),
      total: result.total,
    });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getDb();
    const appointment = await this.service(db).getAppointment(ctx, appointmentId);
    return reply.send(appointmentToPublic(appointment));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const parsed = updateAppointmentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid appointment data");
    }
    const db = await getDb();
    const appointment = await this.service(db).updateAppointment(ctx, appointmentId, parsed.data);
    return reply.send(appointmentToPublic(appointment));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getDb();
    await this.service(db).deleteAppointment(ctx, appointmentId);
    return reply.send({ ok: true });
  }
  /** Patient portal: lists only the caller's OWN appointments (scoped in the service). */
  async getMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listAppointments(ctx, { skip, limit });
    return reply.send({ items: result.items.map(appointmentToPublic), total: result.total });
  }
}
