import type { Db, Filter, UpdateFilter } from "mongodb";
import { getDb } from "@/lib/db-pools";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { now } from "@/clinic/core/datetime";
import { requireClinicOf } from "@/clinic/core/context";
import type { ClinicContext } from "@/clinic/core/context";
import type { ContactDocument } from "@/clinic/modules/crm-contacts/crm-contacts.schema";

export interface CreateContactInput {
  clinicId: string;
  contactId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  seniority?: string | null;
  function?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
  imageUrl?: string | null;
  companyId?: string | null;
  ownerId?: string | null;
  source?: ContactDocument["source"];
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  seniority?: string | null;
  function?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
  imageUrl?: string | null;
  companyId?: string | null;
  ownerId?: string | null;
  enrichmentStatus?: ContactDocument["enrichmentStatus"];
  enrichedAt?: Date | null;
  enrichmentError?: string | null;
  brief?: ContactDocument["brief"];
  lastActivityAt?: Date | null;
  archivedAt?: Date | null;
}

export class ContactRepository {
  constructor(private readonly db: Db, private readonly ctx: ClinicContext) {}

  static for(db: Db, ctx: ClinicContext): ContactRepository {
    return new ContactRepository(db, ctx);
  }

  private get collection() {
    return this.db.collection<ContactDocument>(CLINIC_COLLECTIONS.crmContacts);
  }

  private get clinicId() {
    return requireClinicOf(this.ctx);
  }

  async create(input: CreateContactInput): Promise<ContactDocument> {
    const ts = now();
    const doc: ContactDocument = {
      _id: undefined,
      clinicId: input.clinicId,
      contactId: input.contactId,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      email: input.email?.toLowerCase() ?? null,
      phone: input.phone ?? null,
      title: input.title ?? null,
      seniority: input.seniority ?? null,
      function: input.function ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      twitterUrl: input.twitterUrl ?? null,
      githubUrl: input.githubUrl ?? null,
      imageUrl: input.imageUrl ?? null,
      socialsCheckedAt: null,
      enrichmentStatus: "PENDING",
      enrichedAt: null,
      enrichmentError: null,
      brief: null,
      companyId: input.companyId ?? null,
      ownerId: input.ownerId ?? null,
      source: input.source ?? "MANUAL",
      lastActivityAt: null,
      archivedAt: null,
      deals: [],
      activities: [],
      emailThreads: [],
      calendarEvents: [],
      fieldValues: [],
      visitors: [],
      submissions: [],
      createdAt: ts,
      updatedAt: ts,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async findById(contactId: string): Promise<ContactDocument | null> {
    return this.collection.findOne({ clinicId: this.clinicId, contactId });
  }

  async findByEmail(email: string): Promise<ContactDocument | null> {
    return this.collection.findOne({
      clinicId: this.clinicId,
      email: email.toLowerCase(),
      archivedAt: null,
    });
  }

  async list(
    filter: Filter<ContactDocument>,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    limit = 50,
    skip = 0
  ): Promise<ContactDocument[]> {
    const baseFilter: Filter<ContactDocument> = {
      clinicId: this.clinicId,
      ...filter,
    };
    return this.collection
      .find(baseFilter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async count(filter: Filter<ContactDocument>): Promise<number> {
    return this.collection.countDocuments({
      clinicId: this.clinicId,
      ...filter,
    });
  }

  async update(contactId: string, input: UpdateContactInput): Promise<boolean> {
    const update: UpdateFilter<ContactDocument> = {
      $set: {
        ...input,
        updatedAt: now(),
      },
    };
    const result = await this.collection.updateOne(
      { clinicId: this.clinicId, contactId },
      update
    );
    return (result.modifiedCount ?? 0) > 0;
  }

  async archive(contactId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { clinicId: this.clinicId, contactId },
      { $set: { archivedAt: now(), updatedAt: now() } }
    );
    return (result.modifiedCount ?? 0) > 0;
  }

  async restore(contactId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { clinicId: this.clinicId, contactId },
      { $set: { archivedAt: null, updatedAt: now() } }
    );
    return (result.modifiedCount ?? 0) > 0;
  }

  async delete(contactId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      clinicId: this.clinicId,
      contactId,
    });
    return (result.deletedCount ?? 0) > 0;
  }

  async findBySourceRef(sourceRef: string): Promise<ContactDocument | null> {
    return this.collection.findOne({
      clinicId: this.clinicId,
      $or: [
        { source: sourceRef as any },
        { "brief.sourceUrl": sourceRef as any },
      ],
    });
  }

  async addDeal(contactId: string, dealId: string): Promise<void> {
    await this.collection.updateOne(
      { clinicId: this.clinicId, contactId },
      { $addToSet: { deals: dealId } }
    );
  }

  async removeDeal(contactId: string, dealId: string): Promise<void> {
    await this.collection.updateOne(
      { clinicId: this.clinicId, contactId },
      { $pull: { deals: dealId } as any }
    );
  }

  async addActivity(contactId: string, activityId: string): Promise<void> {
    await this.collection.updateOne(
      { clinicId: this.clinicId, contactId },
      { $addToSet: { activities: activityId } }
    );
  }

  async getFacets(): Promise<Record<string, Record<string, number>>> {
    const pipeline = [
      { $match: { clinicId: this.clinicId, archivedAt: null } },
      {
        $facet: {
          owner: [{ $group: { _id: "$ownerId", count: { $sum: 1 } } }],
          company: [{ $group: { _id: "$companyId", count: { $sum: 1 } } }],
          title: [{ $group: { _id: "$title", count: { $sum: 1 } } }],
          seniority: [{ $group: { _id: "$seniority", count: { $sum: 1 } } }],
          function: [{ $group: { _id: "$function", count: { $sum: 1 } } }],
          source: [{ $group: { _id: "$source", count: { $sum: 1 } } }],
        },
      },
    ];
    const [result] = await this.collection.aggregate(pipeline).toArray();
    if (!result) return {};
    const facets: Record<string, Record<string, number>> = {};
    for (const [key, arr] of Object.entries(result)) {
      facets[key] = {};
      for (const item of arr) {
        if (item._id) facets[key][item._id] = item.count;
      }
    }
    return facets;
  }

  async getTotalCount(archived?: boolean): Promise<number> {
    const filter: Filter<ContactDocument> = { clinicId: this.clinicId };
    if (archived === false) filter.archivedAt = null;
    else if (archived === true) filter.archivedAt = { $ne: null };
    return this.collection.countDocuments(filter);
  }
}

export async function getContactRepository(
  ctx: ClinicContext
): Promise<ContactRepository> {
  return ContactRepository.for(await getDb(), ctx);
}