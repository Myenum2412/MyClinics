import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAuth, requireBilling } from "@/plugins/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { BILL_STATUSES, PAYMENT_METHODS, round2 } from "@/lib/billing";
import { computeBillTotals, mapBill } from "@/routes/bills";
import { canAccessBilling } from "@/lib/roles";
import { findBillVisitData } from "@/lib/bill-visit";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { mapCompany } from "@/routes/organization";
import { handleError } from "@/lib/http";

export function registerBillRoutes(app: FastifyInstance): void {
  app.get("/api/bills/:id/print-data", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid bill id" });
      }

      if (!(await requireAuth(request, reply))) return;

      const db = await getDb();
      const doc = await db
        .collection(DB_COLLECTIONS.bills)
        .findOne({ _id: new ObjectId(id) });
      if (!doc) {
        return reply.code(404).send({ error: "Bill not found" });
      }

      const bill = mapBill(doc);

      const staffAccess = canAccessBilling(request.user?.role);
      if (!staffAccess) {
        const email = request.user?.email?.toLowerCase();
        const patientDoc = email
          ? await db.collection("patients").findOne({ email })
          : null;
        const patientName = patientDoc?.fullName
          ? String(patientDoc.fullName)
          : null;
        const patientPhone = patientDoc?.mobile
          ? String(patientDoc.mobile)
          : null;
        const ownsBill =
          (patientName && bill.patientName === patientName) ||
          (patientPhone && bill.patientPhone === patientPhone);
        if (!ownsBill) {
          return reply.code(403).send({ error: "Forbidden" });
        }
      }

      const [company, visit] = await Promise.all([
        ensureDefaultOrganization(db),
        findBillVisitData(db, bill),
      ]);

      const appointment = visit.appointment
        ? {
            id: visit.appointment._id
              ? String(visit.appointment._id)
              : null,
            fullName: visit.appointment.fullName ?? null,
            mobile: visit.appointment.mobile ?? null,
            age: visit.appointment.age ?? null,
            gender: visit.appointment.gender ?? null,
            email: visit.appointment.email ?? null,
            doctorName: visit.appointment.doctorName ?? null,
            department: visit.appointment.department ?? null,
            date: visit.appointment.date ?? null,
            time: visit.appointment.time ?? null,
            type: visit.appointment.type ?? null,
            status: visit.appointment.status ?? null,
            reason: visit.appointment.reason ?? null,
            notes: visit.appointment.notes ?? null,
            counter: visit.appointment.counter ?? null,
            bookingSource: visit.appointment.bookingSource ?? null,
          }
        : null;

      const prescriptions = visit.prescriptions.map((p) => ({
        id: p._id ? String(p._id) : null,
        patientName: p.patientName ?? null,
        doctorName: p.doctorName ?? null,
        visitDate: p.visitDate ?? null,
        diagnosis: p.diagnosis ?? null,
        medicines: Array.isArray(p.medicines) ? p.medicines : [],
        symptoms: p.symptoms ?? null,
        testsRecommended: p.testsRecommended ?? null,
        followUpDate: p.followUpDate ?? null,
      }));

      const patient = visit.patient
        ? {
            id: String(visit.patient._id),
            fullName: visit.patient.fullName ?? null,
            age: visit.patient.age ?? null,
            gender: visit.patient.gender ?? null,
            email: visit.patient.email ?? null,
            mobile: visit.patient.mobile ?? null,
          }
        : null;

      return reply.send({
        bill,
        clinic: mapCompany(company),
        appointment,
        prescriptions,
        doctors: visit.doctors,
        patient,
      });
    } catch (error) {
      handleError(reply, error, "Get bill print data");
    }
  });

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