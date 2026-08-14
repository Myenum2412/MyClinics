import type { FastifyInstance } from "fastify";
import type { Document } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAuth, requireBilling } from "@/plugins/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { BILL_STATUSES, PAYMENT_METHODS, round2 } from "@/lib/billing";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";
import {
  DEFAULT_LIMIT,
  parsePagination,
  paged,
  textSearch,
} from "@/lib/pagination";
import { searchParams, handleError } from "@/lib/http";

export type BillItemInput = {
  name: string;
  qty: number;
  price: number;
};

export function mapBill(d: Document) {
  return {
    id: d._id.toString(),
    billNumber: d.billNumber,
    patientName: d.patientName,
    patientPhone: d.patientPhone ?? null,
    doctorId: d.doctorId ?? null,
    doctorName: d.doctorName ?? null,
    date: d.date,
    items: Array.isArray(d.items) ? d.items : [],
    subtotal: d.subtotal ?? 0,
    discount: d.discount ?? 0,
    taxRate: d.taxRate ?? 0,
    tax: d.tax ?? 0,
    total: d.total ?? 0,
    paymentMethod: d.paymentMethod ?? "Cash",
    status: d.status ?? "pending",
    notes: d.notes ?? null,
    createdAt: d.createdAt,
  };
}

export function computeBillTotals(
  items: BillItemInput[],
  discount = 0,
  taxRate = 0
) {
  const subtotal = round2(
    items.reduce(
      (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0),
      0
    )
  );
  const safeDiscount = round2(Math.max(0, Number(discount) || 0));
  const safeTaxRate = Math.max(0, Number(taxRate) || 0);
  const taxable = Math.max(0, subtotal - safeDiscount);
  const tax = round2((taxable * safeTaxRate) / 100);
  const total = round2(taxable + tax);
  return { subtotal, discount: safeDiscount, taxRate: safeTaxRate, tax, total };
}

function cleanItems(items: unknown): BillItemInput[] {
  return Array.isArray(items)
    ? items.filter(
        (i) =>
          i &&
          (i.name || "").trim() &&
          (Number(i.qty) > 0 || Number(i.price) > 0)
      )
    : [];
}

export function registerBillsRoutes(app: FastifyInstance): void {
  app.get("/api/bills", async (request, reply) => {
    try {
      // Any authenticated user (doctor, receptionist, patient) can view bills;
      // creating/editing bills stays restricted to billing roles.
      if (!(await requireAuth(request, reply))) return;
      const params = searchParams(request);
      const pagination = parsePagination(params);
      const q = params.get("q");
      const db = await getDb();
      const collection = db.collection(DB_COLLECTIONS.bills);

      const query: Record<string, unknown> = {};
      const search = textSearch(q, ["patientName", "patientPhone", "billNumber"]);
      if (search) query.$or = search.$or ?? search;

      if (pagination) {
        const [bills, total] = await Promise.all([
          collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.pageSize)
            .toArray(),
          collection.countDocuments(query),
        ]);
        return reply.send({
          bills: paged(bills.map(mapBill), total, pagination),
        });
      }

      const bills = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(DEFAULT_LIMIT)
        .toArray();
      return reply.send({ bills: bills.map(mapBill) });
    } catch (error) {
      handleError(reply, error, "List bills");
    }
  });

  app.post("/api/bills", async (request, reply) => {
    try {
      if (!(await requireBilling(request, reply))) return;
      const body = (request.body ?? {}) as Record<string, unknown>;
      const {
        patientName,
        patientPhone,
        date,
        items,
        discount,
        taxRate,
        paymentMethod,
        status,
        notes,
      } = body;

      const clean = cleanItems(items);

      if (!patientName || !String(patientName).trim()) {
        return reply.code(400).send({ error: "Patient name is required" });
      }
      if (!clean.length) {
        return reply.code(400).send({ error: "Add at least one bill item" });
      }

      const totals = computeBillTotals(
        clean,
        Number(discount) || 0,
        Number(taxRate) || 0
      );

      const db = await getDb();
      const count = await db.collection(DB_COLLECTIONS.bills).countDocuments({});
      const billNumber = `INV-${String(count + 1).padStart(4, "0")}`;

      const result = await db.collection(DB_COLLECTIONS.bills).insertOne({
        billNumber,
        patientName: String(patientName).trim(),
        patientPhone: patientPhone ? String(patientPhone).trim() : null,
        doctorId: request.user?.id ?? null,
        doctorName: request.user?.name ?? "Doctor",
        date: date ?? new Date().toISOString().slice(0, 10),
        items: clean.map((i) => ({
          name: (i.name || "").trim(),
          qty: Number(i.qty) || 0,
          price: Number(i.price) || 0,
          amount: round2((Number(i.qty) || 0) * (Number(i.price) || 0)),
        })),
        ...totals,
        paymentMethod: PAYMENT_METHODS.includes(paymentMethod as never)
          ? paymentMethod
          : "Cash",
        status: BILL_STATUSES.includes(status as never) ? status : "pending",
        notes: notes ? String(notes).trim() : null,
        createdAt: new Date(),
      });

      if (patientPhone && String(patientPhone).trim()) {
        await enqueueClinicNotification(
          db,
          String(patientPhone).trim(),
          `Hi ${String(patientName).trim()}, your bill ${billNumber} is ₹${totals.total.toLocaleString("en-IN")}. ` +
            `Please complete payment at your convenience.`,
          "bill"
        );
      }

      return reply.code(201).send({
        bill: { id: result.insertedId.toString(), billNumber, ...totals },
      });
    } catch (error) {
      handleError(reply, error, "Create bill");
    }
  });
}