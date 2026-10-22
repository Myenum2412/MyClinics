import type { Db } from "mongodb";
import { now } from "@/clinic/core/datetime";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import { BadRequestError, NotFoundError } from "@/clinic/core/errors";
import { generateContactId } from "@/clinic/core/ids";
import { ContactRepository, type CreateContactInput, type UpdateContactInput } from "@/clinic/modules/crm-contacts/crm-contacts.repository";
import { contactToPublic, type ContactDocument } from "@/clinic/modules/crm-contacts/crm-contacts.schema";

export interface ListContactsInput {
  archived?: boolean;
  q?: string;
  ownerId?: string;
  companyId?: string;
  source?: ContactDocument["source"];
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ListContactsOutput {
  rows: ReturnType<typeof contactToPublic>[];
  total: number;
  page: number;
  limit: number;
  facetCounts: Record<string, Record<string, number>>;
}

export class ContactService {
  constructor(private readonly db: Db) {}

  private repo(ctx: ClinicContext): ContactRepository {
    return new ContactRepository(this.db, ctx);
  }

  async createContact(ctx: ClinicContext, input: CreateContactInput): Promise<ReturnType<typeof contactToPublic>> {
    if (!input.firstName) throw new BadRequestError("First name is required");
    if (input.email) {
      const existing = await this.repo(ctx).findByEmail(input.email!);
      if (existing) throw new BadRequestError("Contact with this email already exists");
    }
    const doc = await this.repo(ctx).create({
      ...input,
      contactId: generateContactId(),
    });
    return contactToPublic(doc);
  }

  async getContact(ctx: ClinicContext, contactId: string): Promise<ReturnType<typeof contactToPublic>> {
    const doc = await this.repo(ctx).findById(contactId);
    if (!doc) throw new NotFoundError("Contact not found");
    return contactToPublic(doc);
  }

  async listContacts(ctx: ClinicContext, input: ListContactsInput = {}): Promise<ListContactsOutput> {
    const { archived, q, ownerId, companyId, source, page = 1, limit = 50, sort } = input;
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const filter: Record<string, unknown> = {};
    if (archived === false) filter.archivedAt = null;
    else if (archived === true) filter.archivedAt = { $ne: null };
    if (ownerId) filter.ownerId = ownerId;
    if (companyId) filter.companyId = companyId;
    if (source) filter.source = source;
    if (q) {
      filter.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const sortObj: Record<string, 1 | -1> = sort
      ? { [sort.replace(/^-/, "")]: sort.startsWith("-") ? -1 : 1 }
      : { createdAt: -1 };

    const [rows, total, facetCounts] = await Promise.all([
      this.repo(ctx).list(filter, sortObj, safeLimit, skip),
      this.repo(ctx).count(filter),
      this.repo(ctx).getFacets(),
    ]);

    return {
      rows: rows.map(contactToPublic),
      total,
      page: safePage,
      limit: safeLimit,
      facetCounts,
    };
  }

  async updateContact(ctx: ClinicContext, contactId: string, input: UpdateContactInput): Promise<ReturnType<typeof contactToPublic>> {
    const ok = await this.repo(ctx).update(contactId, input);
    if (!ok) throw new NotFoundError("Contact not found");
    const doc = await this.repo(ctx).findById(contactId);
    if (!doc) throw new NotFoundError("Contact not found");
    return contactToPublic(doc);
  }

  async archiveContact(ctx: ClinicContext, contactId: string): Promise<void> {
    const ok = await this.repo(ctx).archive(contactId);
    if (!ok) throw new NotFoundError("Contact not found");
  }

  async restoreContact(ctx: ClinicContext, contactId: string): Promise<void> {
    const ok = await this.repo(ctx).restore(contactId);
    if (!ok) throw new NotFoundError("Contact not found");
  }

  async deleteContact(ctx: ClinicContext, contactId: string): Promise<void> {
    const ok = await this.repo(ctx).delete(contactId);
    if (!ok) throw new NotFoundError("Contact not found");
  }

  async bulkArchive(ctx: ClinicContext, ids: string[]): Promise<number> {
    const result = await this.db.collection("clc_crm_contacts").updateMany(
      { clinicId: requireClinicOf(ctx), contactId: { $in: ids } },
      { $set: { archivedAt: now(), updatedAt: now() } }
    );
    return result.modifiedCount ?? 0;
  }

  async bulkRestore(ctx: ClinicContext, ids: string[]): Promise<number> {
    const result = await this.db.collection("clc_crm_contacts").updateMany(
      { clinicId: requireClinicOf(ctx), contactId: { $in: ids } },
      { $set: { archivedAt: null, updatedAt: now() } }
    );
    return result.modifiedCount ?? 0;
  }

  async bulkDelete(ctx: ClinicContext, ids: string[]): Promise<number> {
    const result = await this.db.collection("clc_crm_contacts").deleteMany(
      { clinicId: requireClinicOf(ctx), contactId: { $in: ids } }
    );
    return result.deletedCount ?? 0;
  }

  async bulkUpdateOwner(ctx: ClinicContext, ids: string[], ownerId: string | null): Promise<number> {
    const result = await this.db.collection("clc_crm_contacts").updateMany(
      { clinicId: requireClinicOf(ctx), contactId: { $in: ids } },
      { $set: { ownerId, updatedAt: now() } }
    );
    return result.modifiedCount ?? 0;
  }

  async bulkUpdateCompany(ctx: ClinicContext, ids: string[], companyId: string | null): Promise<number> {
    const result = await this.db.collection("clc_crm_contacts").updateMany(
      { clinicId: requireClinicOf(ctx), contactId: { $in: ids } },
      { $set: { companyId, updatedAt: now() } }
    );
    return result.modifiedCount ?? 0;
  }
}