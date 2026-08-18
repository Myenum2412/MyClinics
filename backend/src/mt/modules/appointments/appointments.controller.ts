import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/mt/core/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/mt/core/errors";
import { mtPaged, parseMtPagination, queryParamsFromRecord } from "@/mt/core/pagination";
import { requirePatientAccess } from "@/mt/core/tenant-scope";
import {
  appointmentParamsSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  updateAppointmentSchema,
} from "@/mt/modules/appointments/appointments.dto";
import { AppointmentService } from "@/mt/modules/appointments/appointments.service";
import { mapAppointment } from "@/mt/modules/appointments/appointments.schema";

export class AppointmentController {
  private async service() {
    return new AppointmentService(await getDb());
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role === "patient") {
      throw new ForbiddenError("Please ask the clinic to book your appointment");
    }

    const parsed = createAppointmentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const appointment = await (await this.service()).createAppointment(ctx, parsed.data);
    return reply.code(201).send({ appointment: mapAppointment(appointment as never) });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const params = appointmentParamsSchema.safeParse(request.params);
    if (!params.success) throw new ValidationError("Invalid appointment id");

    const service = await this.service();
    const appointment = await service.getAppointmentById(ctx, params.data.appointmentId);

    // Ownership: a patient may only view their own appointments.
    await requirePatientAccess(request, reply, appointment.patientId);

    await writeAudit(await getDb(), ctx, {
      action: "access",
      entity: "appointment",
      entityId: appointment.appointmentId,
      metadata: { patientId: appointment.patientId },
    });

    return reply.send({ appointment: mapAppointment(appointment as never) });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const query = listAppointmentsQuerySchema.safeParse(request.query);
    if (!query.success) {
      throw new ValidationError("Invalid query parameters");
    }
    const pagination = parseMtPagination(queryParamsFromRecord(query.data as never));

    const { items, total } = await (
      await this.service()
    ).listAppointments(ctx, {
      patientId: query.data.patientId,
      status: query.data.status,
      from: query.data.from,
      to: query.data.to,
      skip: pagination.skip,
      limit: pagination.pageSize,
    });

    return reply.send(mtPaged(items.map((a) => mapAppointment(a as never)), total, pagination));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role === "patient") {
      throw new ForbiddenError("Appointments can only be updated by clinic staff");
    }

    const params = appointmentParamsSchema.safeParse(request.params);
    if (!params.success) throw new ValidationError("Invalid appointment id");
    const parsed = updateAppointmentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const appointment = await (
      await this.service()
    ).updateAppointment(ctx, params.data.appointmentId, parsed.data);
    return reply.send({ appointment: mapAppointment(appointment as never) });
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role === "patient") {
      throw new ForbiddenError("Appointments can only be removed by clinic staff");
    }

    const params = appointmentParamsSchema.safeParse(request.params);
    if (!params.success) throw new ValidationError("Invalid appointment id");

    await (await this.service()).deleteAppointment(ctx, params.data.appointmentId);
    return reply.send({ ok: true });
  }
}