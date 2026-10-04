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
import {
  generatePrescriptionPdf,
  type PrescriptionPdfData,
} from "@/lib/prescription-pdf";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";

function calcAge(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return dob;
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const m = now.getMonth() - parsed.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) age -= 1;
  return age >= 0 ? `${age} yrs` : null;
}

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

  async downloadPdf(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { prescriptionId } = request.params as { prescriptionId: string };
    if (!prescriptionId) throw new BadRequestError("prescriptionId is required");
    const db = await getDb();
    const clinicId = requireClinicOf(ctx);
    const prescription = await this.service(db).getPrescription(ctx, prescriptionId);

    const [patient, doctor, clinic] = await Promise.all([
      db.collection(CLINIC_COLLECTIONS.patients).findOne({
        clinicId,
        patientId: prescription.patientId,
        status: { $ne: "deleted" },
      }),
      prescription.doctorId
        ? db.collection(CLINIC_COLLECTIONS.doctors).findOne({
            clinicId,
            doctorId: prescription.doctorId,
            status: { $ne: "deleted" },
          })
        : Promise.resolve(null),
      db.collection(CLINIC_COLLECTIONS.clinics).findOne({
        clinicId,
        status: { $ne: "deleted" },
      }),
    ]);

    const company: OrganizationRecord = {
      id: clinicId,
      name: (clinic as { name?: string } | null)?.name ?? "My Clinic",
      whatsappNumber: null,
      settings: {
        open: (clinic as any)?.settings?.workingHours?.open ?? "09:00",
        close: (clinic as any)?.settings?.workingHours?.close ?? "17:00",
        slotMinutes: (clinic as any)?.settings?.slotMinutes ?? 30,
      },
      phone: (clinic as { phone?: string | null } | null)?.phone ?? null,
      email: (clinic as { email?: string | null } | null)?.email ?? null,
      address: (clinic as { address?: string | null } | null)?.address ?? null,
      website: (clinic as { website?: string | null } | null)?.website ?? null,
      description: (clinic as { description?: string | null } | null)?.description ?? null,
    };

    const pdfData: PrescriptionPdfData = {
      prescriptionId: prescription.prescriptionId,
      visitDate: prescription.visitDate ?? null,
      diagnosis: prescription.diagnosis ?? null,
      notes: prescription.notes ?? null,
      medicines: prescription.medicines ?? [],
      patientName: (patient as { fullName?: string } | null)?.fullName ?? null,
      patientPhone: (patient as { mobile?: string } | null)?.mobile ?? null,
      patientGender: (patient as { gender?: string } | null)?.gender ?? null,
      patientAge: (patient as { dateOfBirth?: string | null } | null)?.dateOfBirth
        ? calcAge((patient as { dateOfBirth?: string | null }).dateOfBirth)
        : null,
      patientAddress: (patient as { address?: string | null } | null)?.address ?? null,
      doctorName: (doctor as { name?: string } | null)?.name ?? null,
      doctorSpecialization: (doctor as { specialization?: string } | null)?.specialization ?? null,
      doctorQualification: (doctor as { qualification?: string | null } | null)?.qualification ?? null,
      doctorRegistrationNo:
        (doctor as { registrationNo?: string | null; licenseNo?: string | null } | null)?.registrationNo ??
        (doctor as { licenseNo?: string | null } | null)?.licenseNo ??
        null,
      generatedBy: ctx.name,
      createdAt: prescription.createdAt ? new Date(prescription.createdAt).toISOString() : null,
    };

    const pdf = await generatePrescriptionPdf(pdfData, company);
    const safePatient = (pdfData.patientName ?? "prescription").replace(/[^A-Za-z0-9-]+/g, "_").slice(0, 40);
    const filename = `prescription-${safePatient}-${prescription.prescriptionId.slice(0, 8)}.pdf`;
    return reply
      .type("application/pdf")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .header("Content-Length", pdf.length)
      .send(pdf);
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
