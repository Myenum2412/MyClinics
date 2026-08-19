import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "@/lib/db";
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
});

export function registerPublicAppointmentRoutes(app: FastifyInstance): void {
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

      // The clinic the patient is registering with. Clinics carry free-text
      // addresses (no separate city/state fields), so the first active clinic
      // is used as the target tenant.
      const clinic = await db
        .collection(CLINIC_COLLECTIONS.clinics)
        .findOne<{ clinicId: string; name: string }>({ status: "active" });
      if (!clinic) {
        return reply
          .code(400)
          .send({ error: "No clinic is available yet. Please try again later." });
      }
      const clinicId = clinic.clinicId;

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
        clinicName: clinic.name,
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