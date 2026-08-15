import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import {
  DEFAULT_LIMIT,
  parsePagination,
  paged,
  textSearch,
} from "@/lib/pagination";
import { searchParams, handleError } from "@/lib/http";
import { requireAuth } from "@/plugins/auth";

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
        currentMedications,
        previousSurgeries,
        familyHistory,
        notes,
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
        currentMedications: currentMedications ?? null,
        previousSurgeries: previousSurgeries ?? null,
        familyHistory: familyHistory ?? null,
        notes: notes ?? null,
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
        currentMedications,
        previousSurgeries,
        familyHistory,
        notes,
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
            currentMedications: currentMedications ?? null,
            previousSurgeries: previousSurgeries ?? null,
            familyHistory: familyHistory ?? null,
            notes: notes ?? null,
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