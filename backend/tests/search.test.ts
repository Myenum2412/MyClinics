import { describe, it, expect, vi } from "vitest";

const { fake } = vi.hoisted(() => {
  function makeFakeDb(seed: Record<string, any[]>) {
    const store: Record<string, any[]> = {};
    for (const [n, docs] of Object.entries(seed)) store[n] = docs.map((d) => ({ ...d }));
    const get = (n: string) => (store[n] ??= []);

    function match(doc: any, filter: Record<string, any>): boolean {
      return Object.entries(filter).every(([k, v]) => {
        if (k === "$or") return (v as Record<string, any>[]).some((f) => match(doc, f));
      if (v && typeof v === "object" && (v.$regex !== undefined || v.$ne !== undefined || v.$in !== undefined)) {
        if (v.$ne !== undefined) return doc[k] !== v.$ne;
        if (v.$in !== undefined) return Array.isArray(v.$in) && v.$in.includes(doc[k]);
        if (v.$regex !== undefined) {
          const flags = v.$options && String(v.$options).includes("i") ? "i" : "";
          return new RegExp(v.$regex as string, flags).test(String(doc[k] ?? ""));
        }
      }
        return doc[k] === v;
      });
    }

    const collection = (n: string) => {
      const makeCursor = (f: Record<string, any>) => {
        const cursor: any = {
          toArray: async () => get(n).filter((d) => match(d, f)),
        };
        cursor.limit = () => cursor;
        cursor.skip = () => cursor;
        cursor.sort = () => cursor;
        cursor.project = () => cursor;
        return cursor;
      };
      return {
        find: (f: Record<string, any> = {}) => makeCursor(f),
        findOne: async (f: Record<string, any> = {}) => get(n).find((d) => match(d, f)) ?? null,
      };
    };

    return { db: { collection }, store };
  }

  const seed = {
    clc_patients: [
      {
        _id: "p1",
        clinicId: "clc1",
        patientId: "pat_1",
        fullName: "Arun Kumar",
        mobile: "919876543210",
        email: "arun@x.com",
        city: "Chennai",
        state: "TN",
        status: "active",
        updatedAt: new Date(),
      },
    ],
    clc_doctors: [
      {
        _id: "d1",
        clinicId: "clc1",
        doctorId: "doc_1",
        name: "Dr. Priya",
        specialization: "Cardiology",
        status: "active",
        updatedAt: new Date(),
      },
    ],
    clc_appointments: [
      {
        _id: "a1",
        clinicId: "clc1",
        appointmentId: "apt_1",
        patientId: "pat_1",
        doctorId: "doc_1",
        date: "2099-01-01",
        time: "10:00",
        status: "scheduled",
        reason: "routine checkup",
        updatedAt: new Date(),
      },
    ],
    clc_prescriptions: [
      {
        _id: "rx1",
        clinicId: "clc1",
        prescriptionId: "prx_1",
        patientId: "pat_1",
        doctorId: "doc_1",
        visitDate: "2099-01-01",
        diagnosis: "flu",
        medicines: [{ name: "Paracetamol" }],
        notes: null,
        status: "active",
        updatedAt: new Date(),
      },
    ],
  };

  const fake = makeFakeDb(seed);
  return { fake };
});

vi.mock("@/lib/db-pools", () => ({
  getDb: async () => fake.db,
  closeAllPools: async () => {},
}));

import { search } from "../src/services/search/search.service";
import { cached, invalidateCache } from "../src/lib/cache";

describe("search (Mongo fallback path)", () => {
  it("returns enabled:false and empty groups for a blank query", async () => {
    const res = await search("clc1", "   ");
    expect(res.enabled).toBe(false);
    expect(res.groups).toHaveLength(0);
    expect(res.total).toBe(0);
  });

  it("cross-entity searches and enriches patient/appointment/prescription", async () => {
    const res = await search("clc1", "Arun");
    expect(res.enabled).toBe(false);
    const byEntity = Object.fromEntries(res.groups.map((g) => [g.entity, g]));

    expect(byEntity.patient).toBeDefined();
    expect(byEntity.patient.hits[0].entityId).toBe("pat_1");

    // Appointment has no name field of its own — it must be enriched from the
    // patient/doctor collections.
    expect(byEntity.appointment).toBeDefined();
    expect(byEntity.appointment.hits[0].entityId).toBe("apt_1");
    expect(byEntity.appointment.hits[0].title).toContain("Arun");

    expect(byEntity.prescription).toBeDefined();
    expect(byEntity.prescription.hits[0].entityId).toBe("prx_1");
    expect(byEntity.prescription.hits[0].title).toContain("Arun");

    // "Arun" does not match the doctor, so no doctor group.
    expect(byEntity.doctor).toBeUndefined();
  });

  it("respects the types filter", async () => {
    const res = await search("clc1", "Arun", { types: ["patient"] });
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0].entity).toBe("patient");
  });

  it("respects clinic isolation", async () => {
    const res = await search("other-clinic", "Arun");
    expect(res.total).toBe(0);
  });
});

describe("cache (in-memory fallback, VALKEY_URL unset)", () => {
  it("caches the loader result and invalidates by prefix", async () => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      return 42;
    };

    expect(await cached("u:k1", 1000, load)).toBe(42);
    expect(calls).toBe(1);
    // served from cache, loader not re-invoked
    expect(await cached("u:k1", 1000, load)).toBe(42);
    expect(calls).toBe(1);

    await invalidateCache("u:");
    expect(await cached("u:k1", 1000, load)).toBe(42);
    expect(calls).toBe(2);
  });
});
