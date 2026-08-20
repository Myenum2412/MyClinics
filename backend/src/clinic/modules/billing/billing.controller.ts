import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { createBillSchema, listBillsSchema, updateBillSchema } from "@/clinic/modules/billing/billing.dto";
import { billToPublic } from "@/clinic/modules/billing/billing.schema";
import { BillingService } from "@/clinic/modules/billing/billing.service";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf } from "@/clinic/core/context";
import {
  generateBillPdf,
  type Bill as PdfBill,
} from "@/lib/bill-pdf";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";

export class BillingController {
  private service(db: Db): BillingService {
    return new BillingService(db);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = createBillSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid bill data");
    }
    const db = await getDb();
    const bill = await this.service(db).createBill(ctx, parsed.data);
    return reply.code(201).send(billToPublic(bill));
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = listBillsSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listBills(ctx, { ...parsed.data, skip, limit });
    return reply.send({ items: result.items.map(billToPublic), total: result.total });
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { billId } = request.params as { billId: string };
    const db = await getDb();
    const bill = await this.service(db).getBill(ctx, billId);
    return reply.send(billToPublic(bill));
  }

  async updateById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { billId } = request.params as { billId: string };
    const parsed = updateBillSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid bill data");
    }
    const db = await getDb();
    const bill = await this.service(db).updateBill(ctx, billId, parsed.data);
    return reply.send(billToPublic(bill));
  }

  async void(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { billId } = request.params as { billId: string };
    const db = await getDb();
    await this.service(db).voidBill(ctx, billId);
    return reply.send({ ok: true });
  }

  async downloadPdf(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { billId } = request.params as { billId: string };
    if (!billId) throw new BadRequestError("billId is required");
    const db = await getDb();
    const clinicId = requireClinicOf(ctx);
    const bill = await this.service(db).getBill(ctx, billId);

    const patient = await db
      .collection(CLINIC_COLLECTIONS.patients)
      .findOne({ clinicId, patientId: bill.patientId, status: { $ne: "deleted" } });
    const doctor = bill.doctorId
      ? await db
          .collection(CLINIC_COLLECTIONS.doctors)
          .findOne({ clinicId, doctorId: bill.doctorId, status: { $ne: "deleted" } })
      : null;

    const clinic = await db
      .collection(CLINIC_COLLECTIONS.clinics)
      .findOne({ clinicId, status: { $ne: "deleted" } });

    const company: OrganizationRecord = {
      id: clinicId,
      name: clinic?.name ?? "My Clinic",
      whatsappNumber: null,
      settings: {
        open: clinic?.settings?.workingHours?.open ?? "09:00",
        close: clinic?.settings?.workingHours?.close ?? "17:00",
        slotMinutes: clinic?.settings?.slotMinutes ?? 30,
      },
      phone: clinic?.phone ?? null,
      email: clinic?.email ?? null,
      address: clinic?.address ?? null,
      website: clinic?.website ?? null,
      description: clinic?.description ?? null,
    };

    const pdfData: PdfBill = {
      billNumber: bill.billNumber,
      patientId: patient?.patientId ?? null,
      patientName: patient?.fullName ?? null,
      patientPhone: patient?.mobile ?? null,
      patientEmail: patient?.email ?? null,
      patientAge: patient?.age ?? null,
      patientGender: patient?.gender ?? null,
      patientAddress: patient?.address ?? null,
      patientBloodGroup: patient?.bloodGroup ?? null,
      doctorName: doctor?.name ?? null,
      date: bill.createdAt.toISOString(),
      invoiceDate: (bill.invoiceDate ?? bill.createdAt).toISOString(),
      dueDate: bill.dueDate ? bill.dueDate.toISOString() : null,
      paidAt: bill.paidAt ? bill.paidAt.toISOString() : null,
      reference: bill.reference,
      items: bill.items.map((item) => ({
        name: item.description,
        qty: item.quantity,
        price: item.unitPrice,
        amount: item.lineTotal,
        discount: item.discount,
        taxPercent: item.taxPercent,
      })),
      subtotal: bill.subtotal,
      discount: bill.discount,
      taxRate: bill.taxPercent,
      tax: bill.taxAmount,
      total: bill.total,
      amountPaid: bill.amountPaid ?? 0,
      balanceDue: bill.balanceDue ?? bill.total ?? 0,
      paymentMethod: bill.paymentType ?? bill.paymentMethod,
      paymentStatus: bill.paymentStatus ?? (bill.status === "paid" ? "paid" : "unpaid"),
      status: bill.status,
      notes: bill.notes,
      generatedBy: ctx.name,
      currency: clinic?.settings?.currency ?? "₹",
    };

    const pdf = await generateBillPdf(pdfData, company);
    const filename = `bill-${bill.billNumber.replace(/[^A-Za-z0-9-]+/g, "_")}.pdf`;
    return reply
      .type("application/pdf")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .header("Content-Length", pdf.length)
      .send(pdf);
  }

  /** Patient portal: lists only the caller's OWN billing (scoped in the service). */
  async getMine(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!ctx.patientId) throw new NotFoundError("Patient account not found");
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listBills(ctx, { skip, limit });
    return reply.send({ items: result.items.map(billToPublic), total: result.total });
  }
}
