import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { BOOKING_SOURCES, type BookingSource } from "@/lib/ai-types";
import { reassignCounters } from "@/services/queue.service";
import { enqueueTurnAlertForNextPatient } from "@/services/whatsapp/notification.service";
import { handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

const TYPES = ["in-person", "video"] as const;

export function registerAppointmentRoutes(app: FastifyInstance): void {
  app.put("/api/appointments/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid appointment id" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const {
        fullName,
        mobile,
        secondaryMobile,
        age,
        gender,
        email,
        whatsapp,
        doctorId,
        doctorName,
        department,
        date,
        time,
        type,
        reason,
        status,
        bookingSource,
        notes,
      } = body;

      const hasFullDetails = Boolean(
        fullName && mobile && doctorId && date && time
      );

      if (!hasFullDetails && !status) {
        const missing: string[] = [];
        if (!fullName) missing.push("Full name");
        if (!mobile) missing.push("Mobile number");
        if (!doctorId) missing.push("Doctor");
        if (!date) missing.push("Date");
        if (!time) missing.push("Time");
        const message =
          missing.length === 1
            ? `${missing[0]} is required`
            : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]} are required`;
        return reply.code(400).send({ error: message });
      }
      if (hasFullDetails && !TYPES.includes(type as (typeof TYPES)[number])) {
        return reply.code(400).send({ error: "Invalid appointment type" });
      }

      const source: BookingSource = BOOKING_SOURCES.includes(
        bookingSource as BookingSource
      )
        ? (bookingSource as BookingSource)
        : "manual";

      const db = await getDb();

      const existing = await db
        .collection("appointments")
        .findOne({ _id: new ObjectId(id) });

      if (!existing) {
        return reply.code(404).send({ error: "Appointment not found" });
      }

      const oldDate = existing.date ? String(existing.date) : "";
      const oldStatus = existing.status ?? "pending";
      const newStatus = hasFullDetails ? (status ?? "pending") : status;

      const update = hasFullDetails
        ? {
            $set: {
              fullName,
              mobile,
              secondaryMobile: secondaryMobile ?? null,
              age: age ?? null,
              gender: gender ?? null,
              email: email ?? null,
              whatsapp: whatsapp ?? null,
              doctorId,
              doctorName: doctorName ?? null,
              department: department ?? null,
              date,
              time,
              type,
              reason: reason ?? null,
              status: status ?? "pending",
              bookingSource: source,
              notes: notes ?? null,
              updatedAt: new Date(),
            },
          }
        : {
            $set: { status, updatedAt: new Date() },
          };

      await db.collection("appointments").updateOne(
        { _id: new ObjectId(id) },
        update
      );

      const affectedDates = new Set([oldDate]);
      if (hasFullDetails && date && date !== oldDate) affectedDates.add(String(date));
      for (const d of affectedDates) {
        if (d) await reassignCounters(db, d);
      }

      if (newStatus === "completed" && oldStatus !== "completed") {
        await enqueueTurnAlertForNextPatient(db, oldDate || String(date)).catch(
          (err) => {
            console.error("Turn alert enqueue error", err);
          }
        );
      }

      return reply.send({ appointment: { id } });
    } catch (error) {
      handleError(reply, error, "Update appointment");
    }
  });

  app.delete("/api/appointments/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid appointment id" });
      }

      const db = await getDb();
      const existing = await db
        .collection("appointments")
        .findOne({ _id: new ObjectId(id) });

      const result = await db
        .collection("appointments")
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return reply.code(404).send({ error: "Appointment not found" });
      }

      const date = existing?.date ? String(existing.date) : "";
      if (date) await reassignCounters(db, date);

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Delete appointment");
    }
  });
}