import type { Db } from "mongodb";

/**
 * Search domain model.
 *
 * Every indexable clinic entity is normalized into a single `SearchDoc` so a
 * single OpenSearch index (`mc_search`) can serve a unified, cross-entity
 * `/api/clinics/:clinicId/search` endpoint. The same registry drives the
 * Mongo fallback search when OpenSearch is not configured.
 */
export type EntityType = "patient" | "appointment" | "prescription" | "doctor";

export interface SearchDoc {
  clinicId: string;
  entity: EntityType;
  entityId: string;
  title: string;
  subtitle: string;
  body: string;
  status: string;
  /** epoch ms — used for tie-break sorting */
  updatedAt: number;
  /** original document with _id stripped, returned for inline display */
  raw: Record<string, unknown>;
}

export const INDEX_NAME = "mc_search";

export const ENTITY_TYPES: EntityType[] = [
  "patient",
  "appointment",
  "prescription",
  "doctor",
];

interface EntityConfig {
  /** Mongo collection that holds the source documents */
  collection: string;
  /** primary id field on the source document */
  idField: string;
  /** fields scanned for the Mongo-regex fallback */
  searchFields: string[];
  /** normalize a source doc into a SearchDoc (may enrich from other collections) */
  build: (doc: Record<string, any>, db: Db) => Promise<SearchDoc | null>;
}

function toEpoch(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value) || Date.now();
  return Date.now();
}

/** Strip the Mongo `_id` (and huge nested arrays) for safe JSON storage. */
export function sanitizeDoc(doc: Record<string, any>): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...doc };
  delete clone._id;
  return clone;
}

export const ENTITY_REGISTRY: Record<EntityType, EntityConfig> = {
  patient: {
    collection: "clc_patients",
    idField: "patientId",
    searchFields: ["fullName", "mobile", "email", "city", "state"],
    async build(doc) {
      if (!doc) return null;
      return {
        clinicId: doc.clinicId,
        entity: "patient",
        entityId: doc.patientId,
        title: doc.fullName ?? "Unnamed patient",
        subtitle: [doc.mobile, doc.email].filter(Boolean).join(" · "),
        body: [
          doc.fullName,
          doc.mobile,
          doc.email,
          doc.city,
          doc.state,
          doc.notes,
        ]
          .filter(Boolean)
          .join(" "),
        status: doc.status ?? "active",
        updatedAt: toEpoch(doc.updatedAt),
        raw: sanitizeDoc(doc),
      };
    },
  },

  appointment: {
    collection: "clc_appointments",
    idField: "appointmentId",
    // The appointment doc only carries ids, so the Mongo fallback scans the
    // fields it does own (weak but functional). The OpenSearch path below
    // enriches with patient + doctor names for real relevance.
    searchFields: ["reason", "notes", "date", "time"],
    async build(doc, db) {
      if (!doc) return null;
      const [patient, doctor] = await Promise.all([
        db
          .collection("clc_patients")
          .findOne(
            { clinicId: doc.clinicId, patientId: doc.patientId, status: { $ne: "deleted" } },
            { projection: { fullName: 1 } }
          ),
        db
          .collection("clc_doctors")
          .findOne(
            { clinicId: doc.clinicId, doctorId: doc.doctorId, status: { $ne: "deleted" } },
            { projection: { name: 1 } }
          ),
      ]);
      const patientName = (patient as { fullName?: string } | null)?.fullName ?? "Patient";
      const doctorName = (doctor as { name?: string } | null)?.name ?? "";
      return {
        clinicId: doc.clinicId,
        entity: "appointment",
        entityId: doc.appointmentId,
        title: patientName,
        subtitle: `${doc.date} ${doc.time}${doctorName ? ` · Dr ${doctorName}` : ""}`.trim(),
        body: [
          patientName,
          doctorName,
          doc.reason,
          doc.notes,
          doc.date,
          doc.time,
        ]
          .filter(Boolean)
          .join(" "),
        status: doc.status ?? "scheduled",
        updatedAt: toEpoch(doc.updatedAt),
        raw: sanitizeDoc(doc),
      };
    },
  },

  prescription: {
    collection: "clc_prescriptions",
    idField: "prescriptionId",
    searchFields: ["diagnosis", "notes", "visitDate"],
    async build(doc, db) {
      if (!doc) return null;
      const [patient, doctor] = await Promise.all([
        db
          .collection("clc_patients")
          .findOne(
            { clinicId: doc.clinicId, patientId: doc.patientId, status: { $ne: "deleted" } },
            { projection: { fullName: 1 } }
          ),
        db
          .collection("clc_doctors")
          .findOne(
            { clinicId: doc.clinicId, doctorId: doc.doctorId, status: { $ne: "deleted" } },
            { projection: { name: 1 } }
          ),
      ]);
      const patientName = (patient as { fullName?: string } | null)?.fullName ?? "Patient";
      const doctorName = (doctor as { name?: string } | null)?.name ?? "";
      const medicineNames = Array.isArray(doc.medicines)
        ? doc.medicines.map((m: any) => m?.name).filter(Boolean).join(" ")
        : "";
      return {
        clinicId: doc.clinicId,
        entity: "prescription",
        entityId: doc.prescriptionId,
        title: patientName,
        subtitle: `${doc.visitDate}${doctorName ? ` · Dr ${doctorName}` : ""}`.trim(),
        body: [patientName, doctorName, doc.diagnosis, medicineNames, doc.notes]
          .filter(Boolean)
          .join(" "),
        status: doc.status ?? "active",
        updatedAt: toEpoch(doc.updatedAt),
        raw: sanitizeDoc(doc),
      };
    },
  },

  doctor: {
    collection: "clc_doctors",
    idField: "doctorId",
    searchFields: ["name", "specialization", "qualification", "email", "phone", "city", "state"],
    async build(doc) {
      if (!doc) return null;
      return {
        clinicId: doc.clinicId,
        entity: "doctor",
        entityId: doc.doctorId,
        title: doc.name ?? "Unnamed doctor",
        subtitle: [doc.specialization, doc.department].filter(Boolean).join(" · "),
        body: [
          doc.name,
          doc.specialization,
          doc.qualification,
          doc.email,
          doc.phone,
          doc.city,
          doc.state,
          doc.notes,
        ]
          .filter(Boolean)
          .join(" "),
        status: doc.status ?? "active",
        updatedAt: toEpoch(doc.updatedAt),
        raw: sanitizeDoc(doc),
      };
    },
  },
};

/** Stable document id inside OpenSearch (unique per entity+clinic+id). */
export function docId(entity: EntityType, clinicId: string, entityId: string): string {
  return `${entity}:${clinicId}:${entityId}`;
}
