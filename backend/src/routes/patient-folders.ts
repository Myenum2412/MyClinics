import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import type { Document, Db } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/plugins/auth";
import { handleError } from "@/lib/http";
import { ensurePatientFolders } from "@/lib/r2";
import { mapFile } from "@/routes/reports";

export const PATIENT_FOLDERS = [
  "appointments",
  "patients",
  "prescriptions",
  "medicines",
  "billing",
  "reports",
] as const;
export type PatientFolderKind = (typeof PATIENT_FOLDERS)[number];

function norm(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export type PatientFolderCounts = {
  appointments: number;
  patients: number;
  prescriptions: number;
  medicines: number;
  billing: number;
  reports: number;
};

export type PatientFolderEntry = {
  id: string;
  fullName: string;
  mobile: string;
  folders: PatientFolderCounts;
};

export function matchPatient(doc: Document, patient: Document): boolean {
  const mobile = String(patient.mobile ?? "").trim();
  const email = String(patient.email ?? "").trim();
  const fullName = norm(patient.fullName);
  if (!fullName) return false;

  const docMobile = String(doc.mobile ?? doc.phone ?? doc.patientPhone ?? "").trim();
  const docEmail = String(doc.email ?? "").trim();
  const docNameField = String(
    doc.fullName ?? doc.patientName ?? ""
  ).trim();

  if (mobile && docMobile && mobile === docMobile) return true;
  if (email && docEmail && email === docEmail) return true;
  if (docNameField && norm(docNameField) === fullName) return true;
  return false;
}

export async function buildPatientFolderIndex(db: Db): Promise<PatientFolderEntry[]> {
  const [patientDocs, appointmentDocs, prescriptionDocs, billDocs, reportDocs] =
    await Promise.all([
      db
        .collection("patients")
        .find({})
        .sort({ fullName: 1 })
        .project({ fullName: 1, mobile: 1, email: 1 })
        .toArray(),
      db
        .collection("appointments")
        .find({})
        .project({ fullName: 1, mobile: 1, email: 1, status: 1 })
        .toArray(),
      db
        .collection("prescriptions")
        .find({})
        .project({ patientName: 1, phone: 1, medicines: 1 })
        .toArray(),
      db
        .collection("bills")
        .find({})
        .project({ patientName: 1, patientPhone: 1, status: 1 })
        .toArray(),
      db
        .collection("reports")
        .find({})
        .project({ patientId: 1, patientName: 1 })
        .toArray(),
    ]);

  const patients: PatientFolderEntry[] = patientDocs.map((p) => {
    const patientId = (p._id as ObjectId).toString();
    const mobile = String(p.mobile ?? "");
    const appointments = appointmentDocs.filter((a) => matchPatient(a, p)).length;
    const prescriptions = prescriptionDocs.filter((pr) => matchPatient(pr, p)).length;
    const medicines = prescriptionDocs
      .filter((pr) => matchPatient(pr, p))
      .reduce(
        (sum, pr) => sum + (Array.isArray(pr.medicines) ? pr.medicines.length : 0),
        0
      );
    const billing = billDocs.filter((b) => matchPatient(b, p)).length;
    const reports = reportDocs.filter(
      (r) =>
        String(r.patientId ?? "") === patientId ||
        (norm(r.patientName) === norm(p.fullName) && !!r.patientName)
    ).length;

    return {
      id: patientId,
      fullName: String(p.fullName ?? ""),
      mobile,
      folders: {
        appointments,
        patients: 1,
        prescriptions,
        medicines,
        billing,
        reports,
      },
    };
  });

  return patients;
}

export async function loadPatientFolder(
  db: Db,
  patientId: string,
  folder: PatientFolderKind,
  patientDoc: Document
) {
  switch (folder) {
    case "appointments": {
      const docs = await db
        .collection("appointments")
        .find({})
        .sort({ date: -1, time: -1 })
        .toArray();
      return docs
        .filter((a) => matchPatient(a, patientDoc))
        .map((a) => ({
          id: (a._id as ObjectId).toString(),
          fullName: a.fullName ?? null,
          mobile: a.mobile ?? null,
          doctorName: a.doctorName ?? null,
          department: a.department ?? null,
          date: a.date ?? null,
          time: a.time ?? null,
          type: a.type ?? null,
          reason: a.reason ?? null,
          status: a.status ?? null,
          createdAt: a.createdAt ?? null,
        }));
    }
    case "patients": {
      return [mapPatientFolderDoc(patientDoc)];
    }
    case "prescriptions": {
      const docs = await db
        .collection("prescriptions")
        .find({})
        .sort({ visitDate: -1, createdAt: -1 })
        .toArray();
      return docs
        .filter((pr) => matchPatient(pr, patientDoc))
        .map((pr) => ({
          id: (pr._id as ObjectId).toString(),
          patientName: pr.patientName ?? null,
          age: pr.age ?? null,
          gender: pr.gender ?? null,
          phone: pr.phone ?? null,
          visitDate: pr.visitDate ?? null,
          diagnosis: pr.diagnosis ?? null,
          medicines: Array.isArray(pr.medicines) ? pr.medicines : [],
          symptoms: pr.symptoms ?? null,
          testsRecommended: pr.testsRecommended ?? null,
          followUpDate: pr.followUpDate ?? null,
          doctorName: pr.doctorName ?? null,
          createdAt: pr.createdAt ?? null,
        }));
    }
    case "medicines": {
      const docs = await db
        .collection("prescriptions")
        .find({})
        .sort({ visitDate: -1, createdAt: -1 })
        .toArray();
      const items: Record<string, unknown>[] = [];
      for (const pr of docs) {
        if (!matchPatient(pr, patientDoc)) continue;
        for (const m of Array.isArray(pr.medicines) ? pr.medicines : []) {
          items.push({
            prescriptionId: (pr._id as ObjectId).toString(),
            visitDate: pr.visitDate ?? null,
            name: m.name ?? null,
            dosage: m.dosage ?? null,
            frequency: m.frequency ?? null,
            duration: m.duration ?? null,
            beforeAfterFood: m.beforeAfterFood ?? null,
            specialInstructions: m.specialInstructions ?? null,
            instructions: m.instructions ?? null,
          });
        }
      }
      return items;
    }
    case "billing": {
      const docs = await db
        .collection("bills")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      return docs
        .filter((b) => matchPatient(b, patientDoc))
        .map((b) => ({
          id: (b._id as ObjectId).toString(),
          billNumber: b.billNumber ?? null,
          patientName: b.patientName ?? null,
          patientPhone: b.patientPhone ?? null,
          doctorName: b.doctorName ?? null,
          date: b.date ?? null,
          subtotal: b.subtotal ?? null,
          discount: b.discount ?? null,
          taxRate: b.taxRate ?? null,
          tax: b.tax ?? null,
          total: b.total ?? null,
          paymentMethod: b.paymentMethod ?? null,
          status: b.status ?? null,
          notes: b.notes ?? null,
          createdAt: b.createdAt ?? null,
        }));
    }
    case "reports": {
      const docs = await db
        .collection("reports")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      return docs
        .filter(
          (r) =>
            String(r.patientId ?? "") === patientId ||
            (norm(r.patientName) === norm(patientDoc.fullName) && !!r.patientName)
        )
        .map((r) => ({ ...mapFile(r), key: undefined }));
    }
  }
}

export function registerPatientFoldersRoutes(app: FastifyInstance): void {
  const ensuredAt = new Map<string, number>();
  const ensurePatientFoldersCached = async (patientId: string) => {
    const now = Date.now();
    const last = ensuredAt.get(patientId) ?? 0;
    if (now - last < 60 * 60 * 1000) return;
    ensuredAt.set(patientId, now);
    await ensurePatientFolders(patientId);
  };

  app.get("/api/patient-folders", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const db = await getDb();
      const patients = await buildPatientFolderIndex(db);

      // Lazily create the R2 folder structure per patient; never fatal.
      await Promise.allSettled(
        patients.map((p) => ensurePatientFoldersCached(p.id))
      );

      return reply.send({ patients });
    } catch (error) {
      handleError(reply, error, "List patient folders");
    }
  });

  app.get("/api/patient-folders/:patientId/:folder", async (request, reply) => {
    if (!(await requireAuth(request, reply))) return;

    try {
      const params = request.params as {
        patientId: string;
        folder: string;
      };
      if (!ObjectId.isValid(params.patientId)) {
        return reply.code(400).send({ error: "Invalid patient id" });
      }
      const folder = params.folder.toLowerCase() as PatientFolderKind;
      if (!PATIENT_FOLDERS.includes(folder)) {
        return reply.code(400).send({
          error: `Unknown folder. Expected one of: ${PATIENT_FOLDERS.join(", ")}`,
        });
      }

      const db = await getDb();
      const patientDoc = await db
        .collection("patients")
        .findOne({ _id: new ObjectId(params.patientId) });
      if (!patientDoc) {
        return reply.code(404).send({ error: "Patient not found" });
      }

      await Promise.allSettled([ensurePatientFoldersCached(params.patientId)]);

      const items = await loadPatientFolder(
        db,
        params.patientId,
        folder,
        patientDoc
      );

      return reply.send({
        patient: {
          id: params.patientId,
          fullName: String(patientDoc.fullName ?? ""),
          mobile: String(patientDoc.mobile ?? ""),
        },
        folder,
        items,
      });
    } catch (error) {
      handleError(reply, error, "Open patient folder");
    }
  });
}

export function mapPatientFolderDoc(p: Document) {
  return {
    id: (p._id as ObjectId).toString(),
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
    allergies: p.allergies ?? null,
    currentMedications: p.currentMedications ?? null,
    previousSurgeries: p.previousSurgeries ?? null,
    familyHistory: p.familyHistory ?? null,
    notes: p.notes ?? null,
    createdAt: p.createdAt,
  };
}