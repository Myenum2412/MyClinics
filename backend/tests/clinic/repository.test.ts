import { describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import {
  ClinicRepository,
  type ClinicDocument,
  type ScopeMode,
} from "@/clinic/core/repository";
import type { ClinicCollectionName } from "@/clinic/core/collections";
import type { ClinicContext } from "@/clinic/core/context";
import {
  CLINIC_A,
  CLINIC_B,
  doctorA1,
  DOCTOR_A1,
  patientA1,
  PATIENT_A1,
  seedIsolationDb,
} from "./helpers/fixtures";

interface TestDoc extends ClinicDocument {
  tenantId?: string;
  name?: string;
  status?: string;
  doctorId?: string;
  patientId?: string;
}

class TestRepo extends ClinicRepository<TestDoc> {
  constructor(db: Db, ctx: ClinicContext, mode?: ScopeMode) {
    super(db, "clc_test_docs" as ClinicCollectionName, ctx, mode);
  }
}

describe("ClinicRepository safety contract", () => {
  const { db } = seedIsolationDb();

  it("stamps clinicId from context on insert — callers cannot supply their own", async () => {
    const repo = new TestRepo(db, doctorA1);
    const inserted = await repo.insert({ name: "doc A" });
    expect(inserted.clinicId).toBe(CLINIC_A);
    expect(inserted.createdAt).toBeInstanceOf(Date);
  });

  it("throws when a raw clinicId appears in a caller filter", async () => {
    const repo = new TestRepo(db, doctorA1);
    await expect(repo.findOne({ clinicId: CLINIC_B } as never)).rejects.toThrow(/Tenant isolation violation/);
    await expect(repo.find({ clinicId: CLINIC_B } as never)).rejects.toThrow(/Tenant isolation violation/);
    await expect(repo.count({ clinicId: CLINIC_B } as never)).rejects.toThrow(/Tenant isolation violation/);
    await expect(repo.updateOne({ clinicId: CLINIC_B } as never, { $set: {} } as never)).rejects.toThrow(/Tenant isolation violation/);
  });

  it("throws when data with clinicId is inserted", async () => {
    const repo = new TestRepo(db, doctorA1);
    await expect(repo.insert({ clinicId: CLINIC_B } as never)).rejects.toThrow(/Tenant isolation violation/);
  });

  it("doctor scope: doctorId is injected automatically for the doctor role", async () => {
    const repo = new TestRepo(db, doctorA1, "doctor");
    const created = await repo.insert({ name: "patient A1 doc" });
    await repo.updateOne({ _id: created._id as never } as never, { $set: { doctorId: "doc_other_doctor" } });
    const others = await repo.find({});
    expect(others.some((d) => (d.doctorId as string | undefined) === "doc_other_doctor")).toBe(false);
    expect(others.every((d) => (d.doctorId as string | undefined) === DOCTOR_A1)).toBe(true);
  });

  it("doctor scope: doctorId filter can still be combined", async () => {
    const repo = new TestRepo(db, doctorA1, "doctor");
    await repo.insert({ name: "x", doctorId: DOCTOR_A1 });
    const found = await repo.find({ doctorId: DOCTOR_A1 });
    expect(found.length).toBeGreaterThan(0);
  });

  it("patient scope: patientId is injected automatically for the patient role", async () => {
    const repo = new TestRepo(db, patientA1, "patient");
    await repo.insert({ name: "own", patientId: PATIENT_A1 });
    await repo.insert({ name: "other", patientId: "pat_other_patient" });
    const others = await repo.find({});
    expect(others.every((d) => (d.patientId as string | undefined) === PATIENT_A1)).toBe(true);
  });

  it("platform_admin (clinicId null) cannot touch clinic collections", async () => {
    const admin = { ...doctorA1, role: "platform_admin" as const, clinicId: null };
    const repo = new TestRepo(db, admin);
    await expect(repo.findOne({})).rejects.toThrow(/without a clinicId/);
    await expect(repo.insert({ name: "x" })).rejects.toThrow(/without a clinicId/);
  });

  it("soft delete flags the record and hides it from default queries", async () => {
    const repo = new TestRepo(db, doctorA1);
    const doc = await repo.insert({ name: "to delete" });
    const ok = await repo.softDelete({ _id: doc._id as never } as never);
    expect(ok).toBe(true);
    expect(await repo.findOne({ _id: doc._id as never } as never)).toBeNull();
    const withDeleted = await repo.findOne({ _id: doc._id as never } as never, true);
    expect(withDeleted?.status).toBe("deleted");
    expect(await repo.count({ name: "to delete" })).toBe(0);
  });

  it("queries never cross the clinic boundary even when another clinic's id is queried directly", async () => {
    const repoA = new TestRepo(db, doctorA1);
    const repoB = new TestRepo(db, { ...doctorA1, clinicId: CLINIC_B });
    await repoA.insert({ name: "A-only" });
    await repoB.insert({ name: "B-only" });
    expect(await repoA.count({ name: "A-only" })).toBe(1);
    expect(await repoA.findOne({ name: "B-only" })).toBeNull();
    expect(await repoB.findOne({ name: "A-only" })).toBeNull();
  });

  it("exists returns false outside the scope", async () => {
    const repoA = new TestRepo(db, doctorA1);
    const repoB = new TestRepo(db, { ...doctorA1, clinicId: CLINIC_B });
    await repoB.insert({ name: "B-secret" });
    expect(await repoA.exists({ name: "B-secret" })).toBe(false);
  });
});