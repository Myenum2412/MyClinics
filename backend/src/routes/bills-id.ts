import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireBilling } from "@/plugins/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { BILL_STATUSES, PAYMENT_METHODS, round2 } from "@/lib/billing";
import { computeBillTotals } from "@/routes/bills";
import { handleError } from "@/lib/http";

export function registerBillRoutes(app: FastifyInstance): void {
  app.put("/api/bills/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid bill id" });
      }

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

      const cleanItems = Array.isArray(items)
        ? items.filter(
            (i) =>
              i &&
              (i.name || "").trim() &&
              (Number(i.qty) > 0 || Number(i.price) > 0)
          )
        : [];

      if (!patientName || !String(patientName).trim()) {
        return reply.code(400).send({ error: "Patient name is required" });
      }
      if (!cleanItems.length) {
        return reply.code(400).send({ error: "Add at least one bill item" });
      }

      const totals = computeBillTotals(
        cleanItems,
        Number(discount) || 0,
        Number(taxRate) || 0
      );

      const db = await getDb();
      const result = await db.collection(DB_COLLECTIONS.bills).updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            patientName: String(patientName).trim(),
            patientPhone: patientPhone ? String(patientPhone).trim() : null,
            doctorId: request.user?.id ?? null,
            doctorName: request.user?.name ?? "Doctor",
            date: date ?? new Date().toISOString().slice(0, 10),
            items: cleanItems.map((i) => ({
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
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return reply.code(404).send({ error: "Bill not found" });
      }

      return reply.send({ bill: { id, ...totals } });
    } catch (error) {
      handleError(reply, error, "Update bill");
    }
  });

  app.delete("/api/bills/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid bill id" });
      }

      if (!(await requireBilling(request, reply))) return;

      const db = await getDb();
      const result = await db
        .collection(DB_COLLECTIONS.bills)
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return reply.code(404).send({ error: "Bill not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Delete bill");
    }
  });
}