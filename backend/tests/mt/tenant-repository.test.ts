import { describe, it, expect } from "vitest";
import { createFakeDb } from "../helpers/fake-db";
import { PatientRepository } from "@/mt/modules/patients/patients.repository";
import type { TenantContext } from "@/mt/core/tenant-context";

function ctx(clinicId: string): TenantContext {
  return {
    userId: `usr_test_${clinicId.slice(-4)}`,
    clinicId,
    role: "staff",
    name: "Test Staff",
    email: "staff@test.local",
    patientId: null,
    tokenId: "jti-test",
    ip: null,
    userAgent: null,
  };
}

function seedPatient(clinicId: string, patientId: string) {
  return createFakeDb({
    mt_patients: [
      {
        clinicId,
        patientId,
        fullName: "Alice",
        mobile: "919999999999",
        createdAt: new Date(),
      },
    ],
  });
}

describe("TenantRepository isolation", () => {
  it("stamps clinicId on every insert", async () => {
    const { db, dump } = createFakeDb();
    const repo = new PatientRepository(db, ctx("clc_A"));
    await repo.insert({
      patientId: "pat_new1",
      fullName: "Bob",
      mobile: "918888888888",
      userId: null,
      email: null,
      gender: null,
      dateOfBirth: null,
      bloodGroup: null,
      address: null,
      city: null,
      pincode: null,
      allergies: [],
      notes: null,
      createdBy: "usr_test",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const docs = dump("mt_patients");
    expect(docs).toHaveLength(1);
    expect(docs[0].clinicId).toBe("clc_A");
    expect(docs[0].createdAt).toBeInstanceOf(Date);
  });

  it("cannot insert a document that claims another clinicId", async () => {
    const { db } = createFakeDb();
    const repo = new PatientRepository(db, ctx("clc_A"));
    await expect(
      repo.insert({
        clinicId: "clc_B",
        patientId: "pat_evil",
        fullName: "Eve",
        mobile: "917777777777",
        createdAt: new Date(),
      } as never)
    ).rejects.toThrow(/Tenant isolation violation/);
  });

  it("rejects filters that try to override clinicId", async () => {
    const { db } = createFakeDb();
    const repo = new PatientRepository(db, ctx("clc_A"));
    await expect(
      repo.findOne({ clinicId: "clc_B", patientId: "pat_x" } as never)
    ).rejects.toThrow(/Tenant isolation violation/);
    await expect(
      repo.updateOne({ clinicId: "clc_B" } as never, { $set: { notes: "x" } })
    ).rejects.toThrow(/Tenant isolation violation/);
  });

  it("never leaks documents from another clinic", async () => {
    const { db } = seedPatient("clc_A", "pat_alice");
    seedPatient("clc_B", "pat_bob"); // different store, but keep single db for realism
    const repoA = new PatientRepository(db, ctx("clc_A"));
    const repoB = new PatientRepository(db, ctx("clc_B"));

    // Clinic B repo cannot see clinic A's patient, even by exact patientId.
    expect(await repoB.findByPatientId("pat_alice")).toBeNull();
    expect(await repoA.findByPatientId("pat_alice")).not.toBeNull();

    // And vice versa.
    expect(await repoA.findByPatientId("pat_bob")).toBeNull();
  });

  it("scopes deletes and updates to the tenant", async () => {
    const { db } = seedPatient("clc_A", "pat_alice");
    const repoA = new PatientRepository(db, ctx("clc_A"));
    const repoB = new PatientRepository(db, ctx("clc_B"));

    // Clinic B attempts to delete clinic A's patient → nothing matched.
    expect(await repoB.deleteOne({ patientId: "pat_alice" })).toBe(false);
    expect(await repoA.findByPatientId("pat_alice")).not.toBeNull();

    const result = await repoB.updateOne(
      { patientId: "pat_alice" },
      { $set: { notes: "hacked" } }
    );
    expect(result.matchedCount).toBe(0);

    // Clinic A's own update works.
    const own = await repoA.updateOne(
      { patientId: "pat_alice" },
      { $set: { notes: "legit" } }
    );
    expect(own.matchedCount).toBe(1);
  });
});