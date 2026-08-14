import { describe, it, expect } from "vitest";
import { createFakeDb } from "./helpers/fake-db";
import {
  ensureDefaultOrganization,
  findOrganizationByWhatsappNumber,
  getOrCreateCustomer,
  getOrganization,
  normalizeWhatsappId,
  normalizePhone,
} from "@/services/customer/customer-context.service";

describe("normalization", () => {
  it("strips the @c.us suffix and punctuation from WhatsApp ids", () => {
    expect(normalizeWhatsappId("+91 98765-43210@c.us")).toBe("919876543210");
  });

  it("strips punctuation from phone numbers", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("15551234567");
  });
});

describe("getOrCreateCustomer", () => {
  it("creates a new customer on first contact", async () => {
    const { db, dump } = createFakeDb();
    const customer = await getOrCreateCustomer(db, {
      organizationId: "org-1",
      whatsappId: "919876543210@c.us",
      phoneNumber: "+91 98765 43210",
    });

    expect(customer.organizationId).toBe("org-1");
    expect(customer.whatsappId).toBe("919876543210");
    expect(customer.phoneNumber).toBe("919876543210");
    expect(customer.preferences).toEqual({});
    expect(dump("wa_customers")).toHaveLength(1);
  });

  it("returns the same customer for the same identity", async () => {
    const { db, dump } = createFakeDb();
    const first = await getOrCreateCustomer(db, {
      organizationId: "org-1",
      whatsappId: "919876543210@c.us",
      phoneNumber: "919876543210",
    });
    const second = await getOrCreateCustomer(db, {
      organizationId: "org-1",
      whatsappId: "919876543210@c.us",
      phoneNumber: "919876543210",
    });

    expect(second.id).toBe(first.id);
    expect(dump("wa_customers")).toHaveLength(1);
  });

  it("isolates customers across organizations", async () => {
    const { db } = createFakeDb();
    const a = await getOrCreateCustomer(db, {
      organizationId: "org-1",
      whatsappId: "919876543210",
      phoneNumber: "919876543210",
    });
    const b = await getOrCreateCustomer(db, {
      organizationId: "org-2",
      whatsappId: "919876543210",
      phoneNumber: "919876543210",
    });

    expect(a.id).not.toBe(b.id);
  });

  it("updates the phone number when it changes", async () => {
    const { db, dump } = createFakeDb();
    await getOrCreateCustomer(db, {
      organizationId: "org-1",
      whatsappId: "919876543210",
      phoneNumber: "919876543210",
    });
    const updated = await getOrCreateCustomer(db, {
      organizationId: "org-1",
      whatsappId: "919876543210",
      phoneNumber: "919876543212",
    });

    expect(updated.phoneNumber).toBe("919876543212");
    expect(dump("wa_customers")).toHaveLength(1);
  });
});

describe("organization resolution", () => {
  it("seeds a default organization when none exists", async () => {
    const { db } = createFakeDb();
    const org = await ensureDefaultOrganization(db);
    expect(org.settings).toMatchObject({ open: "09:00", close: "18:00", slotMinutes: 30 });
  });

  it("reuses an existing default organization", async () => {
    const { db, dump } = createFakeDb({
      organizations: [{ _id: "org-1", name: "Existing Clinic", isDefault: true }],
    });
    const org = await ensureDefaultOrganization(db);
    expect(org.id).toBe("org-1");
    expect(org.name).toBe("Existing Clinic");
    expect(dump("organizations")).toHaveLength(1);
  });

  it("falls back to the default organization when no bot number is matched", async () => {
    const { db } = createFakeDb();
    const org = await findOrganizationByWhatsappNumber(db, null);
    expect(org.id).toBeTruthy();
  });

  it("finds an organization by ObjectId-shaped id", async () => {
    const { db } = createFakeDb({
      organizations: [
        { _id: "org-1", name: "Test Clinic", whatsappNumber: "919876543210", isDefault: true },
      ],
    });
    const org = await getOrganization(db, "org-1");
    expect(org?.name).toBe("Test Clinic");
    expect(org?.whatsappNumber).toBe("919876543210");
  });

  it("returns null for a missing organization", async () => {
    const { db } = createFakeDb();
    expect(await getOrganization(db, "does-not-exist")).toBeNull();
  });
});
