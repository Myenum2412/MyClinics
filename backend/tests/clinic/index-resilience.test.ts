import { describe, expect, it, vi } from "vitest";
import { ensureClinicIndexes } from "@/clinic/indexes";
import { ensureIndexes } from "@/lib/indexes";

// A fake Db whose every collection's createIndex REJECTS — simulating a
// unique index hitting duplicate data in a partially-populated production
// database. Previously this threw and process.exit(1) took the server down
// (HTTP 502 on every route). It must now log + continue.
function failingDb() {
  return {
    collection: () => ({
      createIndex: () => Promise.reject(new Error("E11000 duplicate key")),
    }),
  } as unknown as Parameters<typeof ensureClinicIndexes>[0];
}

describe("index creation is non-fatal", () => {
  it("ensureClinicIndexes does not throw when indexes fail", async () => {
    await expect(ensureClinicIndexes(failingDb())).resolves.toBeUndefined();
  });
  it("ensureIndexes does not throw when indexes fail", async () => {
    await expect(ensureIndexes(failingDb())).resolves.toBeUndefined();
  });
});
