import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "@/lib/db-pools";
import { AppError } from "@/clinic/core/errors";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { randomToken, systemContext } from "@/clinic/core/ids";
import { PatientService } from "@/clinic/modules/patients/patients.service";

/**
 * Public appointment registration — no auth required.
 *
 * The home page form collects the patient's city and state; submitting it
 * automatically creates a patient portal account for the clinic with a
 * randomly generated password, and the login credentials are delivered to
 * the patient's WhatsApp number (queued via the platform notification
 * worker). Registered before the clinic-scope middleware, so it stays open.
 *
 *   POST /api/public/appointments/register → { ok, patientId, clinicName }
 */
const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Patient name is required").max(120),
  mobile: z.string().trim().min(8, "WhatsApp number is required").max(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(120)
    .optional()
    .nullable(),
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().min(1, "State is required").max(120),
  clinicId: z.string().trim().min(1).optional().nullable(),
});

export function registerPublicAppointmentRoutes(app: FastifyInstance): void {
  app.get("/api/public/clinics", async (request, reply) => {
    try {
      const db = await getDb();
      const query = request.query as { state?: string; city?: string };
      const filter: Record<string, any> = { status: "active" };
      if (query.state) {
        filter["profile.state"] = { $regex: new RegExp(`^${query.state}$`, "i") };
      }
      if (query.city) {
        filter["profile.city"] = { $regex: new RegExp(`^${query.city}$`, "i") };
      }
      const clinics = await db
        .collection(CLINIC_COLLECTIONS.clinics)
        .find<{ clinicId: string; name: string; address: string | null; profile?: { city?: string | null; state?: string | null } }>(
          filter,
          { projection: { clinicId: 1, name: 1, address: 1, "profile.city": 1, "profile.state": 1 } }
        )
        .toArray();
      return clinics.map((c) => ({
        clinicId: c.clinicId,
        name: c.name,
        address: c.address,
        city: c.profile?.city ?? null,
        state: c.profile?.state ?? null,
      }));
    } catch (error) {
      reply.code(500).send({ error: "Failed to fetch clinics" });
    }
  });

  app.post("/api/public/appointments/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    }
    const input = parsed.data;

    try {
      const db = await getDb();

      let clinicId = input.clinicId;
      let clinicName = "";

      if (clinicId) {
        const clinicDoc = await db
          .collection(CLINIC_COLLECTIONS.clinics)
          .findOne<{ clinicId: string; name: string }>({ clinicId, status: "active" });
        if (!clinicDoc) {
          return reply.code(400).send({ error: "Selected clinic not found or inactive." });
        }
        clinicName = clinicDoc.name;
      } else {
        const clinicDoc = await db
          .collection(CLINIC_COLLECTIONS.clinics)
          .findOne<{ clinicId: string; name: string }>({ status: "active" });
        if (!clinicDoc) {
          return reply
            .code(400)
            .send({ error: "No clinic is available yet. Please try again later." });
        }
        clinicId = clinicDoc.clinicId;
        clinicName = clinicDoc.name;
      }

      // Auto-generated portal login: patients sign in with email + password,
      // so derive an email from the mobile number when none was provided.
      const password = randomToken(8);
      const email =
        input.email ?? `${input.mobile.replace(/\D/g, "").slice(-10)}@patient.mc`;

      const patient = await new PatientService(db).createPatient(
        systemContext(clinicId)!,
        {
          fullName: input.fullName,
          mobile: input.mobile,
          whatsapp: input.mobile,
          email,
          city: input.city,
          state: input.state,
          password,
          portalAccess: "enable",
          loginNotification: "whatsapp",
        }
      );

      return reply.code(201).send({
        ok: true,
        patientId: patient.patientId,
        clinicName,
        message:
          "Your patient account was created. Your login details were sent to your WhatsApp number.",
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply
          .code(error.statusCode)
          .send({ error: error.message, code: error.code });
      }
      throw error;
    }
  });
}