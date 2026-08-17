import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { BOOKING_SOURCES, type BookingSource } from "@/lib/ai-types";
import { reassignCounters } from "@/services/queue.service";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";
import {
  DEFAULT_LIMIT,
  parsePagination,
  paged,
  textSearch,
} from "@/lib/pagination";
import { searchParams, handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

const TYPES = ["in-person", "video"] as const;

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return out;
}

export function mapAppointment(a: Record<string, unknown>) {
  return {
    id: (a._id as { toString(): string }).toString(),
    fullName: a.fullName,
    mobile: a.mobile,
    secondaryMobile: a.secondaryMobile ?? null,
    age: a.age,
    gender: a.gender,
    email: a.email,
    whatsapp: a.whatsapp ?? null,
    doctorId: (a.doctorId as { toString(): string } | undefined)?.toString() ?? null,
    doctorName: a.doctorName,
    department: a.department,
    date: a.date,
    time: a.time,
    type: a.type,
    reason: a.reason,
    status: a.status,
    bookingSource: (a.bookingSource ?? "manual") as BookingSource,
    notes: a.notes ?? null,
    whatsappConversationId: a.whatsappConversationId ?? null,
    counter: a.counter ?? null,
    createdAt: a.createdAt,
  };
}

export function registerAppointmentsRoutes(app: FastifyInstance): void {
  app.get("/api/appointments", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const params = searchParams(request);
      const pagination = parsePagination(params);
      const q = params.get("q");
      const db = await getDb();
      const collection = db.collection("appointments");

      const query: Record<string, unknown> = {};
      const search = textSearch(q, ["fullName", "mobile"]);
      if (search) query.$or = search.$or ?? search;

      if (pagination) {
        const [docs, total] = await Promise.all([
          collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.pageSize)
            .toArray(),
          collection.countDocuments(query),
        ]);
        return reply.send({
          appointments: paged(docs.map(mapAppointment), total, pagination),
        });
      }

      const docs = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(DEFAULT_LIMIT)
        .toArray();
      return reply.send({ appointments: docs.map(mapAppointment) });
    } catch (error) {
      handleError(reply, error, "List appointments");
    }
  });

  app.post("/api/appointments", async (request, reply) => {
    // Public endpoint: anonymous visitors book from the home page. The
    // requireAuth guard only applies to listing/managing appointments.
    try {
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
        bookingSource,
        notes,
      } = body;

      if (!fullName || !mobile || !doctorId || !date || !time) {
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
      if (!TYPES.includes(type as (typeof TYPES)[number])) {
        return reply.code(400).send({ error: "Invalid appointment type" });
      }

      const source: BookingSource = BOOKING_SOURCES.includes(
        bookingSource as BookingSource
      )
        ? (bookingSource as BookingSource)
        : "manual";

      const db = await getDb();
      const result = await db.collection("appointments").insertOne({
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
        status: "pending",
        bookingSource: source,
        notes: notes ?? null,
        whatsappConversationId: null,
        createdAt: new Date(),
      });

      await reassignCounters(db, String(date));

      let accountCreated = false;
      let credentialsQueued = false;
      let confirmationQueued = false;

      try {
        const patients = db.collection("patients");
        const users = db.collection("users");
        const existingPatient = await patients.findOne({
          mobile: String(mobile),
        });

        if (!existingPatient) {
          const digits = String(mobile).replace(/\D/g, "");
          const loginEmail = email
            ? String(email).toLowerCase()
            : digits
              ? `patient${digits}@myclinic.in`
              : null;

          if (loginEmail) {
            const existingUser = await users.findOne({ email: loginEmail });
            if (!existingUser) {
              const password = generatePassword();
              const hashedPassword = await bcrypt.hash(password, 10);
              const userResult = await users.insertOne({
                name: fullName,
                email: loginEmail,
                password: hashedPassword,
                role: "patient",
                image: null,
                createdAt: new Date(),
              });
              await patients.insertOne({
                fullName,
                mobile,
                age: age ?? null,
                gender: gender ?? null,
                email: email ? String(email).toLowerCase() : null,
                whatsapp: whatsapp ?? mobile,
                userId: userResult.insertedId,
                createdAt: new Date(),
              });
              accountCreated = true;

              const credentialsMessage =
                `Welcome to My Clinics, ${fullName}! Your patient account has been created.\n\n` +
                `Login Email: ${loginEmail}\nPassword: ${password}\n\n` +
                `You can sign in at https://myclinic.myenum.in/login`;
              const queued = await enqueueClinicNotification(
                db,
                String(mobile),
                credentialsMessage,
                "credentials"
              );
              credentialsQueued = queued.queued;
            }
          }
        }
      } catch {
        // Account creation must never fail the booking itself.
      }

      try {
        const confirmationPhone = whatsapp || mobile;
        const firstName = String(fullName).split(" ")[0] || "there";
        const doctor = doctorName ? ` with ${doctorName}` : "";
        const confirmationMessage =
          `Hi ${firstName}, your appointment at ${String(time)}${doctor} on ${String(date)} is confirmed. ` +
          `We will send you a reminder about an hour before your appointment. ` +
          `Reply here if you need to reschedule or cancel.`;
        const queued = await enqueueClinicNotification(
          db,
          String(confirmationPhone),
          confirmationMessage,
          "appointment_confirmation"
        );
        confirmationQueued = queued.queued;
      } catch {
        // Confirmation notification must never fail the booking itself.
      }

      return reply.code(201).send({
        appointment: {
          id: result.insertedId.toString(),
          fullName,
          mobile,
          date,
          time,
          type,
          status: "pending",
          bookingSource: source,
        },
        patientAccountCreated: accountCreated,
        credentialsQueued: credentialsQueued,
        confirmationQueued,
      });
    } catch (error) {
      handleError(reply, error, "Create appointment");
    }
  });
}