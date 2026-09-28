import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import {
  createPrescriptionSchema,
  listPrescriptionsSchema,
  updatePrescriptionSchema,
} from "@/clinic/modules/prescriptions/prescriptions.dto";
import { prescriptionToPublic } from "@/clinic/modules/prescriptions/prescriptions.schema";
import { PrescriptionService } from "@/clinic/modules/prescriptions/prescriptions.service";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf } from "@/clinic/core/context";

export class PrescriptionController {
  private service(db: Db): PrescriptionService {
    return new PrescriptionService(db);
  }

  /** Single-record reads/writes skip the list endpoint's join, so resolve the same names here. */
  private async withNames(db: Db, clinicId: string, prescription: Parameters<typeof prescriptionToPublic>[0]) {
    const [patient, doctor] = await Promise.all([
      db.collection(CLINIC_COLLECTIONS.patients).findOne({ clinicId, patientId: prescription.patientId }),
      prescription.doctorId
        ? db.collection(CLINIC_COLLECTIONS.doctors).findOne({ clinicId, doctorId: prescription.doctorId })
        : Promise.resolve(null),
    ]);
    return {
      ...prescriptionToPublic(prescription),
      patientName: (patient as { fullName?: string } | null)?.fullName ?? null,
      patientPhone: (patient as { mobile?: string } | null)?.mobile ?? null,
      doctorName: (doctor as { name?: string } | null)?.name ?? null,
    };
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createPrescriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid prescription data");
    }
    const db = await getDb();
    const prescription = await this.service(db).createPrescription(ctx, parsed.data);
    return reply.code(201).send(await this.withNames(db, requireClinicOf(ctx), prescription));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listPrescriptionsSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listPrescriptions(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(prescriptionToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { prescriptionId } = request.params as { prescriptionId: string };
    const db = await getDb();
    const prescription = await this.service(db).getPrescription(ctx, prescriptionId);
    return reply.send(await this.withNames(db, requireClinicOf(ctx), prescription));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { prescriptionId } = request.params as { prescriptionId: string };
    const parsed = updatePrescriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid prescription data");
    }
    const db = await getDb();
    const prescription = await this.service(db).updatePrescription(ctx, prescriptionId, parsed.data);
    return reply.send(await this.withNames(db, requireClinicOf(ctx), prescription));
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { prescriptionId } = request.params as { prescriptionId: string };
    const db = await getDb();
    await this.service(db).deletePrescription(ctx, prescriptionId);
    return reply.send({ ok: true });
  }
  /** Patient portal: lists only the caller's OWN prescriptions (scoped in the service). */
  async getMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listPrescriptions(ctx, { skip, limit });
    return reply.send({ items: result.items.map(prescriptionToPublic), total: result.total });
  }
}
