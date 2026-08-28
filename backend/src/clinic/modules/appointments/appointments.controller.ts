import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getAppointmentsDb } from "@/lib/db-pools";
import { todayDateString } from "@/lib/stats";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import {
  appointmentSchema,
  listAppointmentsSchema,
  queueSettingsSchema,
  rescheduleQueueSchema,
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
    const db = await getAppointmentsDb();
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
    const db = await getAppointmentsDb();
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
    const db = await getAppointmentsDb();
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
    const db = await getAppointmentsDb();
    const appointment = await this.service(db).updateAppointment(ctx, appointmentId, parsed.data);
    return reply.send(appointmentToPublic(appointment));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getAppointmentsDb();
    await this.service(db).deleteAppointment(ctx, appointmentId);
    return reply.send({ ok: true });
  }
  /** Patient portal: lists only the caller's OWN appointments (scoped in the service). */
  async getMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getAppointmentsDb();
    const result = await this.service(db).listAppointments(ctx, { skip, limit });
    return reply.send({ items: result.items.map(appointmentToPublic), total: result.total });
  }

  /** Patient portal: books an appointment for the caller's OWN profile. */
  async createMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const parsed = appointmentSchema.safeParse({
      ...(request.body as Record<string, unknown>),
      patientId: ctx.patientId,
    });
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid appointment data");
    }
    const db = await getAppointmentsDb();
    const appointment = await this.service(db).createAppointment(ctx, parsed.data);
    return reply.code(201).send(appointmentToPublic(appointment));
  }

  // ----- Token / Queue management -----

  async getQueue(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { doctorId, date } = request.query as { doctorId?: string; date?: string };
    const effectiveDate = date ?? todayDateString();
    const db = await getAppointmentsDb();
    const snapshot = await this.service(db).getQueue(ctx, doctorId ?? null, effectiveDate);
    return reply.send(snapshot);
  }

  async checkIn(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const body = (request.body ?? {}) as { priority?: boolean };
    const db = await getAppointmentsDb();
    const updated = await this.service(db).checkInPatient(ctx, appointmentId, !!body.priority);
    return reply.send(appointmentToPublic(updated));
  }

  async callNext(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as { doctorId?: string; date?: string };
    const db = await getAppointmentsDb();
    const result = await this.service(db).callNextPatient(ctx, body.doctorId ?? null, body.date ?? todayDateString());
    return reply.send(result);
  }

  async startConsultation(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getAppointmentsDb();
    const updated = await this.service(db).startConsultation(ctx, appointmentId);
    return reply.send(appointmentToPublic(updated));
  }

  async skip(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getAppointmentsDb();
    const updated = await this.service(db).skipPatient(ctx, appointmentId);
    return reply.send(appointmentToPublic(updated));
  }

  async recall(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getAppointmentsDb();
    const updated = await this.service(db).recallPatient(ctx, appointmentId);
    return reply.send(appointmentToPublic(updated));
  }

  async complete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getAppointmentsDb();
    const updated = await this.service(db).completePatient(ctx, appointmentId);
    return reply.send(appointmentToPublic(updated));
  }

  async noShow(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getAppointmentsDb();
    const updated = await this.service(db).markNoShowPatient(ctx, appointmentId);
    return reply.send(appointmentToPublic(updated));
  }

  async cancelQueue(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const db = await getAppointmentsDb();
    const updated = await this.service(db).cancelQueuePatient(ctx, appointmentId);
    return reply.send(appointmentToPublic(updated));
  }

  async rescheduleQueue(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { appointmentId } = request.params as { appointmentId: string };
    const parsed = rescheduleQueueSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid reschedule data");
    }
    const db = await getAppointmentsDb();
    const updated = await this.service(db).rescheduleQueuePatient(
      ctx,
      appointmentId,
      parsed.data.date,
      parsed.data.time
    );
    return reply.send(appointmentToPublic(updated));
  }

  async getQueueSettings(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getAppointmentsDb();
    const settings = await this.service(db).getQueueSettings(ctx);
    return reply.send(settings);
  }

  async saveQueueSettings(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = queueSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid queue settings");
    }
    const db = await getAppointmentsDb();
    const settings = await this.service(db).saveQueueSettings(ctx, parsed.data);
    return reply.send(settings);
  }
}
