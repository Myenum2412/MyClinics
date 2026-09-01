import { now as nowFn } from "@/clinic/core/datetime";
import { ObjectId, type Db } from "mongodb";
import { DB_COLLECTIONS, DEFAULT_WORKING_HOURS } from "@/lib/constants";
import type { WaCustomer } from "@/lib/ai-types";
import { logger } from "@/lib/logger";

export interface OrganizationRecord {
  id: string;
  name: string;
  whatsappNumber: string | null;
  settings: { open: string; close: string; slotMinutes: number };
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
}

interface OrganizationDoc {
  _id: ObjectId | string;
  name: string;
  whatsappNumber?: string | null;
  isDefault?: boolean;
  settings?: { open?: string; close?: string; slotMinutes?: number };
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  description?: string | null;
}

function toOrganization(doc: OrganizationDoc): OrganizationRecord {
  const settings = doc.settings ?? {};
  return {
    id: doc._id.toString(),
    name: doc.name,
    whatsappNumber: doc.whatsappNumber ?? null,
    settings: {
      open: settings.open ?? DEFAULT_WORKING_HOURS.open,
      close: settings.close ?? DEFAULT_WORKING_HOURS.close,
      slotMinutes: settings.slotMinutes ?? DEFAULT_WORKING_HOURS.slotMinutes,
    },
    phone: doc.phone ?? null,
    email: doc.email ?? null,
    address: doc.address ?? null,
    website: doc.website ?? null,
    description: doc.description ?? null,
  };
}

let defaultOrgCache: OrganizationRecord | null = null;

export async function ensureDefaultOrganization(db: Db): Promise<OrganizationRecord> {
  const existing = await db.collection(DB_COLLECTIONS.organizations).findOne({
    isDefault: true,
  });

  if (existing) {
    defaultOrgCache = toOrganization(existing as never);
    return defaultOrgCache;
  }

  const result = await db.collection(DB_COLLECTIONS.organizations).insertOne({
    name: "Default Clinic",
    whatsappNumber: null,
    isDefault: true,
    settings: {
      open: DEFAULT_WORKING_HOURS.open,
      close: DEFAULT_WORKING_HOURS.close,
      slotMinutes: DEFAULT_WORKING_HOURS.slotMinutes,
    },
    phone: null,
    email: null,
    address: null,
    website: null,
    description: null,
    createdAt: nowFn(),
    updatedAt: nowFn(),
  });

  const inserted = await db
    .collection(DB_COLLECTIONS.organizations)
    .findOne({ _id: result.insertedId });
  defaultOrgCache = toOrganization(inserted as never);
  logger.info("default organization created", { organizationId: defaultOrgCache.id });
  return defaultOrgCache;
}

/**
 * Resolves the organization that owns a WhatsApp number.
 * Falls back to the default organization so an unconfigured deployment still works.
 */
export async function findOrganizationByWhatsappNumber(
  db: Db,
  botNumber: string | null
): Promise<OrganizationRecord> {
  if (botNumber) {
    const normalized = normalizeWhatsappId(botNumber);
    const doc = await db
      .collection(DB_COLLECTIONS.organizations)
      .findOne({ whatsappNumber: normalized });
    if (doc) return toOrganization(doc as never);
  }
  return ensureDefaultOrganization(db);
}

export async function getOrganization(
  db: Db,
  organizationId: string
): Promise<OrganizationRecord | null> {
  let filter: { _id: ObjectId } | { _id: string };
  try {
    filter = { _id: new ObjectId(organizationId) };
  } catch {
    filter = { _id: organizationId };
  }
  const doc = await db
    .collection<OrganizationDoc>(DB_COLLECTIONS.organizations)
    .findOne(filter);
  if (!doc) return null;
  return toOrganization(doc);
}

export interface OrganizationDetailsPatch {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
}

/**
 * Updates clinic/company details on the organization record. When the updated
 * organization is the default one, the in-memory cache is refreshed so later
 * WhatsApp/API reads see the new values.
 */
export async function updateOrganizationDetails(
  db: Db,
  organizationId: string,
  patch: OrganizationDetailsPatch
): Promise<OrganizationRecord> {
  await db.collection(DB_COLLECTIONS.organizations).updateOne(
    { _id: new ObjectId(organizationId) },
    { $set: { ...patch, updatedAt: nowFn() } }
  );
  const doc = await db
    .collection<OrganizationDoc>(DB_COLLECTIONS.organizations)
    .findOne({ _id: new ObjectId(organizationId) });
  if (!doc) {
    throw new Error("Organization not found after update");
  }
  const record = toOrganization(doc);
  if (doc.isDefault) {
    defaultOrgCache = record;
  }
  return record;
}

export function normalizeWhatsappId(raw: string): string {
  return raw.split("@")[0].replace(/[^0-9]/g, "");
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

interface CustomerDoc {
  _id: { toString(): string };
  organizationId: string;
  whatsappId: string;
  phoneNumber: string;
  name?: string | null;
  preferences?: Record<string, string>;
  importantInformation?: string[];
  conversationSummary?: string | null;
  appointmentHistory?: WaCustomer["appointmentHistory"];
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

function toCustomer(doc: CustomerDoc): WaCustomer {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    whatsappId: doc.whatsappId,
    phoneNumber: doc.phoneNumber,
    name: doc.name ?? null,
    preferences: doc.preferences ?? {},
    importantInformation: doc.importantInformation ?? [],
    conversationSummary: doc.conversationSummary ?? null,
    appointmentHistory: doc.appointmentHistory ?? [],
    lastInteractionAt: doc.lastInteractionAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Finds the customer by WhatsApp identity, or creates a new customer record.
 * Identity is scoped to (organizationId, whatsappId) so customers are never
 * mixed across organizations or between different people.
 */
export async function getOrCreateCustomer(
  db: Db,
  params: {
    organizationId: string;
    whatsappId: string;
    phoneNumber: string;
    name?: string | null;
  }
): Promise<WaCustomer> {
  const whatsappId = normalizeWhatsappId(params.whatsappId);
  const phoneNumber = normalizePhone(params.phoneNumber) || whatsappId;
  const name = params.name?.trim() || null;
  const collection = db.collection(DB_COLLECTIONS.waCustomers);

  const existing = await collection.findOne({
    organizationId: params.organizationId,
    whatsappId,
  });
  if (existing) {
    const customer = toCustomer(existing as never);
    const updates: Record<string, unknown> = { updatedAt: nowFn() };
    if (customer.phoneNumber !== phoneNumber) updates.phoneNumber = phoneNumber;
    if (name && customer.name !== name) updates.name = name;
    if (Object.keys(updates).length > 1) {
      await collection.updateOne({ _id: existing._id }, { $set: updates });
      customer.phoneNumber = (updates.phoneNumber as string) ?? customer.phoneNumber;
      customer.name = (updates.name as string) ?? customer.name;
    }
    return customer;
  }

  const now = nowFn();
  const result = await collection.insertOne({
    organizationId: params.organizationId,
    whatsappId,
    phoneNumber,
    name,
    preferences: {},
    importantInformation: [],
    conversationSummary: null,
    appointmentHistory: [],
    lastInteractionAt: now,
    createdAt: now,
    updatedAt: now,
  });

  logger.info("new customer created", {
    organizationId: params.organizationId,
    customerId: result.insertedId.toString(),
  });

  const created = await collection.findOne({ _id: result.insertedId });
  return toCustomer(created as never);
}

export async function touchCustomer(
  db: Db,
  organizationId: string,
  customerId: string
): Promise<void> {
  try {
    const { ObjectId } = await import("mongodb");
    await db.collection(DB_COLLECTIONS.waCustomers).updateOne(
      { _id: new ObjectId(customerId), organizationId } as never,
      { $set: { lastInteractionAt: nowFn(), updatedAt: nowFn() } }
    );
  } catch {
    // fallback to legacy field if ObjectId invalid
    await db.collection(DB_COLLECTIONS.waCustomers).updateOne(
      { organizationId, customerId } as never,
      { $set: { lastInteractionAt: nowFn(), updatedAt: nowFn() } }
    );
  }
}
