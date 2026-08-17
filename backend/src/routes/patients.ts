import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { ObjectId, type Db } from "mongodb";
import { getDb } from "@/lib/db";
import {
  DEFAULT_LIMIT,
  parsePagination,
  paged,
  textSearch,
} from "@/lib/pagination";
import { searchParams, handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(val: unknown): string {
  if (!val) return "—";
  const s = String(val);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Builds a comprehensive WhatsApp summary for a patient.
 * Fetches related appointments, bills and prescriptions from the DB.
 */
async function buildPatientMessage(
  db: Db,
  patient: Record<string, unknown>,
  opts: { plainPassword?: string | null; appUrl: string; orgName: string }
): Promise<string> {
  const { plainPassword, appUrl, orgName } = opts;
  const firstName = String(patient.fullName).split(" ")[0] || "there";
  const nameLower = String(patient.fullName).toLowerCase();
  const mobile = String(patient.mobile ?? "");
  const today = new Date().toISOString().slice(0, 10);

  // Fetch related data in parallel
  const [appointments, prescriptions, bills] = await Promise.all([
    db
      .collection("appointments")
      .find({
        $or: [
          { mobile },
          { fullName: { $regex: new RegExp(`^${nameLower}$`, "i") } },
        ],
      })
      .sort({ date: -1 })
      .limit(5)
      .toArray(),
    db
      .collection("prescriptions")
      .find({ patientName: { $regex: new RegExp(`^${nameLower}$`, "i") } })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray(),
    db
      .collection("bills")
      .find({
        $or: [
          { patientPhone: mobile },
          { patientName: { $regex: new RegExp(`^${nameLower}$`, "i") } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray(),
  ]);

  const lines: string[] = [];

  // ── Header ──────────────────────────────────────────────────────────────
  lines.push(`🏥 *${orgName} — Patient Summary*`);
  lines.push(`Hello ${firstName}! Here is your complete patient information.`);
  lines.push("");

  // ── Patient Profile ─────────────────────────────────────────────────────
  lines.push("*👤 Patient Profile*");
  lines.push(`• Name      : ${patient.fullName}`);
  if (patient.age)        lines.push(`• Age       : ${patient.age} yrs`);
  if (patient.gender)     lines.push(`• Gender    : ${patient.gender}`);
  if (patient.dateOfBirth) lines.push(`• DOB       : ${fmtDate(patient.dateOfBirth)}`);
  if (patient.bloodGroup) lines.push(`• Blood Grp : ${patient.bloodGroup}`);
  lines.push(`• Mobile    : ${patient.mobile}`);
  if (patient.whatsapp && patient.whatsapp !== patient.mobile)
    lines.push(`• WhatsApp  : ${patient.whatsapp}`);
  if (patient.email)      lines.push(`• Email     : ${patient.email}`);
  if (patient.address || patient.city) {
    const addr = [patient.address, patient.city, patient.pincode].filter(Boolean).join(", ");
    lines.push(`• Address   : ${addr}`);
  }
  if (patient.occupation)    lines.push(`• Occupation: ${patient.occupation}`);
  if (patient.maritalStatus) lines.push(`• Marital   : ${patient.maritalStatus}`);
  if (patient.guardianName)  lines.push(`• Guardian  : ${patient.guardianName}`);
  if (patient.emergencyContactName || patient.emergencyContactPhone) {
    lines.push(`• Emergency : ${patient.emergencyContactName ?? ""} ${patient.emergencyContactPhone ?? ""}`.trimEnd());
  }
  if (patient.allergies)         lines.push(`• Allergies : ${patient.allergies}`);
  if (patient.currentMedications) lines.push(`• Curr. Meds: ${patient.currentMedications}`);
  if (patient.smoking || patient.alcohol) {
    const habits = [patient.smoking === "Yes" ? "Smoker" : null, patient.alcohol === "Yes" ? "Alcohol" : null].filter(Boolean).join(", ");
    if (habits) lines.push(`• Habits    : ${habits}`);
  }
  lines.push("");

  // ── Medical History ─────────────────────────────────────────────────────
  if (Array.isArray(patient.medicalHistory) && patient.medicalHistory.length) {
    lines.push("*📋 Medical History*");
    const hist = patient.medicalHistory as { date?: string | null; record?: string }[];
    for (const entry of hist.slice(0, 5)) {
      const dateStr = entry.date ? fmtDate(entry.date) : "";
      lines.push(`• ${dateStr ? `[${dateStr}] ` : ""}${entry.record ?? ""}`);
    }
    lines.push("");
  }

  // ── Appointments ────────────────────────────────────────────────────────
  if (appointments.length) {
    const upcoming = appointments.filter((a) => String(a.date ?? "") >= today);
    const past     = appointments.filter((a) => String(a.date ?? "") < today);

    if (upcoming.length) {
      lines.push("*📅 Upcoming Appointments*");
      for (const a of upcoming.slice(0, 3)) {
        const status = String(a.status ?? "").replace(/_/g, " ");
        lines.push(`• ${fmtDate(a.date)} at ${a.time}`);
        if (a.doctorName) lines.push(`  Doctor : ${a.doctorName}`);
        if (a.department) lines.push(`  Dept   : ${a.department}`);
        if (a.reason)     lines.push(`  Reason : ${a.reason}`);
        lines.push(`  Status : ${status}`);
      }
      lines.push("");
    }

    if (past.length) {
      lines.push("*🕐 Recent Appointments*");
      for (const a of past.slice(0, 3)) {
        const status = String(a.status ?? "").replace(/_/g, " ");
        lines.push(`• ${fmtDate(a.date)} at ${a.time} — ${status}`);
        if (a.doctorName) lines.push(`  Doctor : ${a.doctorName}`);
        if (a.reason)     lines.push(`  Reason : ${a.reason ?? "—"}`);
      }
      lines.push("");
    }
  }

  // ── Prescriptions ───────────────────────────────────────────────────────
  if (prescriptions.length) {
    lines.push("*💊 Recent Prescriptions*");
    for (const rx of prescriptions.slice(0, 2)) {
      lines.push(`• ${fmtDate(rx.visitDate)} — ${rx.diagnosis}`);
      if (rx.doctorName) lines.push(`  Doctor  : ${rx.doctorName}`);
      const meds = Array.isArray(rx.medicines) ? rx.medicines.map((m: { name?: string }) => m?.name).filter(Boolean) : [];
      if (meds.length) lines.push(`  Medicines: ${meds.join(", ")}`);
      if (rx.followUpDate) lines.push(`  Follow-up: ${fmtDate(rx.followUpDate)}`);
      if (rx.testsRecommended) lines.push(`  Tests    : ${rx.testsRecommended}`);
    }
    lines.push("");
  }

  // ── Bills ───────────────────────────────────────────────────────────────
  if (bills.length) {
    lines.push("*🧾 Recent Bills*");
    for (const b of bills.slice(0, 3)) {
      const total = Number(b.total ?? 0).toLocaleString("en-IN");
      const status = String(b.status ?? "pending");
      lines.push(`• ${b.billNumber} | ₹${total} | ${status.toUpperCase()}`);
      lines.push(`  Date    : ${fmtDate(b.date)}`);
      if (b.doctorName) lines.push(`  Doctor  : ${b.doctorName}`);
      const items = Array.isArray(b.items) ? b.items.map((i: { name?: string }) => i?.name).filter(Boolean) : [];
      if (items.length) lines.push(`  Items   : ${items.join(", ")}`);
    }
    lines.push("");
  }

  // ── Login Credentials ───────────────────────────────────────────────────
  if (patient.email) {
    lines.push("*🔐 Your Patient Portal Login*");
    lines.push(`• Email    : ${patient.email}`);
    if (plainPassword) {
      lines.push(`• Password : ${plainPassword}`);
    } else {
      lines.push(`• Password : (the one set during registration)`);
      lines.push(`  Forgot it? Reset at: ${appUrl}/forgot-password`);
    }
    lines.push(`• Login at : ${appUrl}/login`);
    lines.push("");
  }

  lines.push("Thank you for choosing *" + orgName + "*! 🙏");

  return lines.join("\n");
}

export type MedicalHistoryEntry = {
  date: string | null;
  record: string;
};

function mapMedicalHistory(value: unknown): MedicalHistoryEntry[] | null {
  if (Array.isArray(value)) {
    const entries = value
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const entry = e as Record<string, unknown>;
        return {
          date: entry.date ? String(entry.date) : null,
          record: entry.record ? String(entry.record).trim() : "",
        };
      })
      .filter((e) => e.record);
    return entries.length ? entries : null;
  }
  if (typeof value === "string" && value.trim()) {
    return [{ date: null, record: value.trim() }];
  }
  return null;
}

function sanitizeMedicalHistory(value: unknown): MedicalHistoryEntry[] | null {
  return mapMedicalHistory(value);
}

function mapPatient(p: Record<string, unknown>) {
  return {
    id: (p._id as { toString(): string }).toString(),
    fullName: p.fullName,
    mobile: p.mobile,
    secondaryMobile: p.secondaryMobile ?? null,
    age: p.age,
    gender: p.gender,
    email: p.email,
    whatsapp: p.whatsapp ?? null,
    bloodGroup: p.bloodGroup ?? null,
    dateOfBirth: p.dateOfBirth ?? null,
    weight: p.weight ?? null,
    height: p.height ?? null,
    guardianName: p.guardianName ?? null,
    emergencyContactName: p.emergencyContactName ?? null,
    emergencyContactPhone: p.emergencyContactPhone ?? null,
    maritalStatus: p.maritalStatus ?? null,
    smoking: p.smoking ?? null,
    alcohol: p.alcohol ?? null,
    address: p.address ?? null,
    city: p.city ?? null,
    pincode: p.pincode ?? null,
    occupation: p.occupation ?? null,
    medicalHistory: mapMedicalHistory(p.medicalHistory),
    allergies: p.allergies ?? null,
    currentMedications: p.currentMedications ?? null,
    previousSurgeries: p.previousSurgeries ?? null,
    familyHistory: p.familyHistory ?? null,
    notes: p.notes ?? null,
    createdAt: p.createdAt,
  };
}

export function registerPatientsRoutes(app: FastifyInstance): void {
  app.get("/api/patients", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const params = searchParams(request);
      const pagination = parsePagination(params);
      const q = params.get("q");
      const db = await getDb();
      const collection = db.collection("patients");

      const query: Record<string, unknown> = {};
      const search = textSearch(q, ["fullName", "mobile", "email"]);
      if (search) query.$or = search.$or ?? search;

      if (pagination) {
        const [patients, total] = await Promise.all([
          collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.pageSize)
            .toArray(),
          collection.countDocuments(query),
        ]);
        return reply.send({
          patients: paged(patients.map(mapPatient), total, pagination),
        });
      }

      const patients = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(DEFAULT_LIMIT)
        .toArray();
      return reply.send({ patients: patients.map(mapPatient) });
    } catch (error) {
      handleError(reply, error, "List patients");
    }
  });

  app.post("/api/patients", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const {
        fullName,
        mobile,
        secondaryMobile,
        age,
        gender,
        email,
        password,
        whatsapp,
        bloodGroup,
        dateOfBirth,
        weight,
        height,
        guardianName,
        emergencyContactName,
        emergencyContactPhone,
        maritalStatus,
        smoking,
        alcohol,
        address,
        city,
        pincode,
        occupation,
        medicalHistory,
        allergies,
      } = body;

      if (!fullName || !mobile) {
        return reply
          .code(400)
          .send({ error: "Full name and mobile number are required" });
      }
      if (!email || !password) {
        return reply.code(400).send({
          error: "Email and password are required to create the patient account",
        });
      }
      if (typeof password !== "string" || password.length < 6) {
        return reply
          .code(400)
          .send({ error: "Password must be at least 6 characters" });
      }

      const db = await getDb();

      const users = db.collection("users");
      const existing = await users.findOne({ email: String(email).toLowerCase() });
      if (existing) {
        return reply.code(409).send({
          error: "An account with this email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);
      const userResult = await users.insertOne({
        name: fullName,
        email: String(email).toLowerCase(),
        password: hashedPassword,
        role: "patient",
        image: null,
        createdAt: new Date(),
      });

      const patientResult = await db.collection("patients").insertOne({
        fullName,
        mobile,
        secondaryMobile: secondaryMobile ?? null,
        age: age ?? null,
        gender: gender ?? null,
        email: String(email).toLowerCase(),
        whatsapp: whatsapp ?? null,
        bloodGroup: bloodGroup ?? null,
        dateOfBirth: dateOfBirth ?? null,
        weight: weight ?? null,
        height: height ?? null,
        guardianName: guardianName ?? null,
        emergencyContactName: emergencyContactName ?? null,
        emergencyContactPhone: emergencyContactPhone ?? null,
        maritalStatus: maritalStatus ?? null,
        smoking: smoking ?? null,
        alcohol: alcohol ?? null,
        address: address ?? null,
        city: city ?? null,
        pincode: pincode ?? null,
        occupation: occupation ?? null,
        medicalHistory: sanitizeMedicalHistory(medicalHistory),
        allergies: allergies ?? null,
        userId: userResult.insertedId,
        createdAt: new Date(),
      });

      return reply.code(201).send({
        patient: {
          id: patientResult.insertedId.toString(),
          userId: userResult.insertedId.toString(),
          fullName,
          mobile,
        },
      });
    } catch (error) {
      handleError(reply, error, "Create patient");
    }
  });

  // Send login credentials to a patient via WhatsApp
  app.post("/api/patients/:id/send-credentials", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid patient id" });
      }

      const db = await getDb();
      const patient = await db
        .collection("patients")
        .findOne({ _id: new ObjectId(id) });

      if (!patient) {
        return reply.code(404).send({ error: "Patient not found" });
      }

      const phone = (patient.whatsapp ?? patient.mobile) as string | null | undefined;
      if (!phone) {
        return reply
          .code(400)
          .send({ error: "Patient has no WhatsApp or mobile number to send credentials to." });
      }

      if (!patient.email) {
        return reply
          .code(400)
          .send({ error: "Patient has no email address on record." });
      }

      const appUrl = process.env.APP_URL?.trim() || "https://myclinic.myenum.in";
      const org = await ensureDefaultOrganization(db);

      // Optional: caller can supply a plain-text password in the body
      const body = (request.body ?? {}) as Record<string, unknown>;
      const plainPassword =
        typeof body.password === "string" && body.password.length >= 6
          ? body.password
          : null;

      if (plainPassword && !body.skipPasswordUpdate) {
        // If a new password is provided, update the patient's login account so
        // the password they receive via WhatsApp is actually valid.
        if (patient.userId) {
          const hashedPassword = await bcrypt.hash(plainPassword, 10);
          await db.collection("users").updateOne(
            { _id: patient.userId },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
          );
        }
      }

      // Build comprehensive patient summary with all related data
      const message = await buildPatientMessage(db, patient as Record<string, unknown>, {
        plainPassword,
        appUrl,
        orgName: org.name,
      });

      const result = await enqueueClinicNotification(db, String(phone), message, "patient_credentials");

      if (!result.queued) {
        return reply
          .code(400)
          .send({ error: "Could not prepare the phone number for WhatsApp." });
      }

      return reply.send({ queued: true, remoteId: result.remoteId });
    } catch (error) {
      handleError(reply, error, "Send patient credentials");
    }
  });

  app.put("/api/patients/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid patient id" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const {
        fullName,
        mobile,
        secondaryMobile,
        age,
        gender,
        whatsapp,
        bloodGroup,
        dateOfBirth,
        weight,
        height,
        guardianName,
        emergencyContactName,
        emergencyContactPhone,
        maritalStatus,
        smoking,
        alcohol,
        address,
        city,
        pincode,
        occupation,
        medicalHistory,
        allergies,
      } = body;

      if (!fullName || !mobile) {
        return reply
          .code(400)
          .send({ error: "Full name and mobile number are required" });
      }

      const db = await getDb();
      const result = await db.collection("patients").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            fullName,
            mobile,
            secondaryMobile: secondaryMobile ?? null,
            age: age ?? null,
            gender: gender ?? null,
            whatsapp: whatsapp ?? null,
            bloodGroup: bloodGroup ?? null,
            dateOfBirth: dateOfBirth ?? null,
            weight: weight ?? null,
            height: height ?? null,
            guardianName: guardianName ?? null,
            emergencyContactName: emergencyContactName ?? null,
            emergencyContactPhone: emergencyContactPhone ?? null,
            maritalStatus: maritalStatus ?? null,
            smoking: smoking ?? null,
            alcohol: alcohol ?? null,
            address: address ?? null,
            city: city ?? null,
            pincode: pincode ?? null,
            occupation: occupation ?? null,
            medicalHistory: sanitizeMedicalHistory(medicalHistory),
            allergies: allergies ?? null,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return reply.code(404).send({ error: "Patient not found" });
      }

      return reply.send({ patient: { id } });
    } catch (error) {
      handleError(reply, error, "Update patient");
    }
  });

  app.delete("/api/patients/:id", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid patient id" });
      }

      const db = await getDb();
      const patient = await db
        .collection("patients")
        .findOneAndDelete({ _id: new ObjectId(id) });

      if (!patient) {
        return reply.code(404).send({ error: "Patient not found" });
      }

      if (patient.userId) {
        await db.collection("users").deleteOne({ _id: patient.userId });
      }

      return reply.send({ ok: true });
    } catch (error) {
      handleError(reply, error, "Delete patient");
    }
  });
}