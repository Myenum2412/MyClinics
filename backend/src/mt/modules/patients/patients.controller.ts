import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/mt/core/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/mt/core/errors";
import { mtPaged, parseMtPagination, queryParamsFromRecord } from "@/mt/core/pagination";
import { requirePatientAccess } from "@/mt/core/tenant-scope";
import {
  createPatientSchema,
  listPatientsQuerySchema,
  patientIdParamsSchema,
  updatePatientSchema,
} from "@/mt/modules/patients/patients.dto";
import { PatientService } from "@/mt/modules/patients/patients.service";
import { PatientRepository } from "@/mt/modules/patients/patients.repository";
import { mapPatient } from "@/mt/modules/patients/patients.schema";

export class PatientController {
  private async service() {
    return new PatientService(await getDb());
  }

  /** POST /api/mt/patients — staff + clinic_admin (patient role is forbidden). */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role === "patient") {
      throw new ForbiddenError("Patients cannot register other patients");
    }

    const parsed = createPatientSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const patient = await (await this.service()).createPatient(ctx, parsed.data);
    return reply.code(201).send({ patient: mapPatient(patient as never) });
  }

  /**
   * GET /api/mt/patients/:patientId
   *
   * Tenant safety: the repository always merges clinicId from the JWT, so a
   * patientId belonging to another clinic returns 404 (never leaked).
   * Ownership: for role=patient the guard compares the target id with the
   * patientId claim in the token — anything else returns 403.
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const params = patientIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw new ValidationError("Invalid patient id");
    }
    const { patientId } = params.data;

    await requirePatientAccess(request, reply, patientId);

    const patient = await (await this.service()).getPatientById(ctx, patientId);

    await writeAudit(await getDb(), ctx, {
      action: "access",
      entity: "patient",
      entityId: patientId,
      metadata: { viewerRole: ctx.role },
    });

    return reply.send({ patient: mapPatient(patient as never) });
  }

  /**
   * GET /api/mt/patients
   * Staff: paginated clinic-wide list. Patient: only their own record.
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const query = listPatientsQuerySchema.safeParse(request.query);
    if (!query.success) {
      throw new ValidationError("Invalid query parameters");
    }
    const pagination = parseMtPagination(queryParamsFromRecord(query.data as never));

    if (ctx.role === "patient") {
      if (!ctx.patientId) throw new NotFoundError("Patient not found");
      const patient = await (await this.service()).getPatientById(ctx, ctx.patientId);
      await writeAudit(await getDb(), ctx, {
        action: "access",
        entity: "patient",
        entityId: ctx.patientId,
        metadata: { viewerRole: ctx.role },
      });
      return reply.send({
        items: [mapPatient(patient as never)],
        total: 1,
        page: 1,
        pageSize: 1,
        pages: 1,
      });
    }

    const { items, total } = await (
      await this.service()
    ).listPatients(ctx, {
      q: query.data.q,
      skip: pagination.skip,
      limit: pagination.pageSize,
    });

    return reply.send(mtPaged(items.map((p) => mapPatient(p as never)), total, pagination));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const params = patientIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw new ValidationError("Invalid patient id");
    }
    const parsed = updatePatientSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join("; "));
    }

    const patient = await (
      await this.service()
    ).updatePatient(ctx, params.data.patientId, parsed.data);
    return reply.send({ patient: mapPatient(patient as never) });
  }

  /**
   * GET /api/mt/me/patient — the caller's own patient record.
   * Patients get their own record; staff/admins get their linked record
   * (if they were created as patients) or 404.
   */
  async getSelf(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();

    const service = await this.service();
    let patientId = ctx.patientId;
    if (ctx.role === "patient" && !patientId) {
      throw new NotFoundError("Patient record not found");
    }

    if (patientId) {
      const patient = await service.getPatientById(ctx, patientId);
      return reply.send({ patient: mapPatient(patient as never) });
    }

    const linked = await new PatientRepository(await getDb(), ctx).findByUserId(ctx.userId);
    if (!linked) throw new NotFoundError("No patient record linked to this account");
    return reply.send({ patient: mapPatient(linked as never) });
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const ctx = request.tenant;
    if (!ctx) throw new ForbiddenError();
    if (ctx.role !== "clinic_admin") {
      throw new ForbiddenError("Only the clinic admin can delete patients");
    }

    const params = patientIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw new ValidationError("Invalid patient id");
    }

    await (await this.service()).deletePatient(ctx, params.data.patientId);
    return reply.send({ ok: true });
  }
}