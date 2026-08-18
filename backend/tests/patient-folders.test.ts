import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  buildPatientFolderIndex,
  loadPatientFolder,
  matchPatient,
} from "@/routes/patient-folders";

function patientDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    fullName: "Ravi Kumar",
    mobile: "9876543210",
    email: "ravi@example.com",
    ...overrides,
  };
}

function fakeDb(docs: {
  patients?: Record<string, unknown>[];
  appointments?: Record<string, unknown>[];
  prescriptions?: Record<string, unknown>[];
  bills?: Record<string, unknown>[];
  reports?: Record<string, unknown>[];
}): any {
  const collections: Record<string, Record<string, unknown>[]> = {
    patients: docs.patients ?? [],
    appointments: docs.appointments ?? [],
    prescriptions: docs.prescriptions ?? [],
    bills: docs.bills ?? [],
    reports: docs.reports ?? [],
  };
  return {
    collection(name: string) {
      return {
        find: () => ({
          sort: () => ({
            project: () => ({
              toArray: async () => collections[name] ?? [],
            }),
            toArray: async () => collections[name] ?? [],
          }),
          project: () => ({
            toArray: async () => collections[name] ?? [],
          }),
          toArray: async () => collections[name] ?? [],
        }),
        findOne: async () => collections[name]?.[0] ?? null,
      };
    },
  };
}

describe("matchPatient", () => {
  it("matches by mobile", () => {
    const patient = patientDoc({ mobile: "9876543210" });
    expect(matchPatient({ mobile: "9876543210" }, patient)).toBe(true);
    expect(matchPatient({ mobile: "1111111111" }, patient)).toBe(false);
  });

  it("matches by phone / patientPhone fields", () => {
    const patient = patientDoc({ mobile: "9876543210" });
    expect(matchPatient({ phone: "9876543210" }, patient)).toBe(true);
    expect(matchPatient({ patientPhone: "9876543210" }, patient)).toBe(true);
  });

  it("matches by email", () => {
    const patient = patientDoc({ email: "ravi@example.com" });
    expect(matchPatient({ email: "ravi@example.com" }, patient)).toBe(true);
    expect(matchPatient({ email: "other@example.com" }, patient)).toBe(false);
  });

  it("matches by normalized full name", () => {
    const patient = patientDoc({ fullName: "Ravi   Kumar" });
    expect(matchPatient({ fullName: "ravi kumar" }, patient)).toBe(true);
    expect(matchPatient({ patientName: "Ravi Kumar" }, patient)).toBe(true);
    expect(matchPatient({ patientName: "Ravi K." }, patient)).toBe(false);
  });

  it("does not match when patient has no name", () => {
    const patient = patientDoc({ fullName: "" });
    expect(matchPatient({ mobile: "9876543210" }, patient)).toBe(false);
  });
});

describe("buildPatientFolderIndex", () => {
  it("counts related records per patient", async () => {
    const ravi = patientDoc();
    const raviId = (ravi._id as ObjectId).toString();
    const suman = patientDoc({
      _id: new ObjectId(),
      fullName: "Suman Devi",
      mobile: "9123456780",
    });
    const db = fakeDb({
      patients: [ravi, suman],
      appointments: [
        { fullName: "Ravi Kumar", mobile: "9876543210", status: "completed" },
        { fullName: "Suman Devi", mobile: "9123456780", status: "scheduled" },
        { fullName: "Suman Devi", mobile: "9123456780", status: "scheduled" },
      ],
      prescriptions: [
        {
          patientName: "Ravi Kumar",
          phone: "9876543210",
          medicines: [{ name: "Paracetamol" }, { name: "Cetirizine" }],
        },
        {
          patientName: "Suman Devi",
          phone: "9123456780",
          medicines: [{ name: "Amoxicillin" }],
        },
      ],
      bills: [
        { patientName: "Ravi Kumar", patientPhone: "9876543210", status: "paid" },
      ],
      reports: [{ patientId: raviId, patientName: "Ravi Kumar" }],
    });

    const index = await buildPatientFolderIndex(db);
    expect(index).toHaveLength(2);

    const raviEntry = index.find((e) => e.id === raviId)!;
    expect(raviEntry.folders.appointments).toBe(1);
    expect(raviEntry.folders.prescriptions).toBe(1);
    expect(raviEntry.folders.medicines).toBe(2);
    expect(raviEntry.folders.billing).toBe(1);
    expect(raviEntry.folders.reports).toBe(1);
    expect(raviEntry.folders.patients).toBe(1);

    const sumanEntry = index.find((e) => e.id === (suman._id as ObjectId).toString())!;
    expect(sumanEntry.folders.appointments).toBe(2);
    expect(sumanEntry.folders.prescriptions).toBe(1);
    expect(sumanEntry.folders.medicines).toBe(1);
    expect(sumanEntry.folders.billing).toBe(0);
  });

  it("returns empty list when no patients", async () => {
    const index = await buildPatientFolderIndex(fakeDb({}));
    expect(index).toEqual([]);
  });
});

describe("loadPatientFolder", () => {
  it("returns patient profile for patients folder", async () => {
    const ravi = patientDoc({ age: 34, gender: "male" });
    const db = fakeDb({ patients: [ravi] });
    const items = await loadPatientFolder(
      db,
      (ravi._id as ObjectId).toString(),
      "patients",
      ravi
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      fullName: "Ravi Kumar",
      mobile: "9876543210",
      age: 34,
    });
  });

  it("returns medicines from matched prescriptions", async () => {
    const ravi = patientDoc();
    const db = fakeDb({
      prescriptions: [
        {
          _id: new ObjectId(),
          patientName: "Ravi Kumar",
          phone: "9876543210",
          visitDate: "2026-08-01",
          medicines: [
            { name: "Paracetamol", dosage: "500mg", frequency: "1-0-1" },
          ],
        },
      ],
    });
    const items = await loadPatientFolder(
      db,
      (ravi._id as ObjectId).toString(),
      "medicines",
      ravi
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Paracetamol",
      dosage: "500mg",
      frequency: "1-0-1",
    });
  });

  it("returns no billing for unmatched patient", async () => {
    const ravi = patientDoc();
    const db = fakeDb({
      bills: [
        {
          _id: new ObjectId(),
          billNumber: "INV-0001",
          patientName: "Someone Else",
          patientPhone: "0000000000",
          total: 500,
        },
      ],
    });
    const items = await loadPatientFolder(
      db,
      (ravi._id as ObjectId).toString(),
      "billing",
      ravi
    );
    expect(items).toEqual([]);
  });
});