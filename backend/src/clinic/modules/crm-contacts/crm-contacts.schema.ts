import type { Document } from "mongodb";

/**
 * CRM Contact — a person in the pipeline (lead, customer, partner, etc.).
 * Multi-tenant, clinic-scoped via clinicId.
 */
export interface ContactDocument extends Document {
  _id: unknown;
  clinicId: string;
  contactId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  seniority: string | null;
  function: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  imageUrl: string | null;
  socialsCheckedAt: Date | null;

  enrichmentStatus: "PENDING" | "RUNNING" | "COMPLETE" | "FAILED" | "SKIPPED";
  enrichedAt: Date | null;
  enrichmentError: string | null;

  brief: ContactBrief | null;

  companyId: string | null;
  ownerId: string | null;

  source: "MANUAL" | "IMPORT" | "EMAIL" | "CALENDAR" | "TRACKING" | "WEBSITE" | "META";

  lastActivityAt: Date | null;
  archivedAt: Date | null;

  deals: string[];
  activities: string[];
  emailThreads: string[];
  calendarEvents: string[];
  fieldValues: string[];
  visitors: string[];
  submissions: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ContactBrief {
  contactId: string;
  narrative: string;
  sections: Record<string, unknown>;
  score: number;
  sourceUrl: string | null;
  sessionId: string | null;
  refreshedAt: Date;
}

export type ContactSource =
  | "MANUAL"
  | "IMPORT"
  | "EMAIL"
  | "CALENDAR"
  | "TRACKING"
  | "WEBSITE"
  | "META";

export type EnrichmentStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETE"
  | "FAILED"
  | "SKIPPED";

export function contactName(doc: { firstName: string; lastName: string | null }): string {
  return `${doc.firstName} ${doc.lastName ?? ""}`.trim();
}

export function contactToPublic(doc: ContactDocument) {
  return {
    contactId: doc.contactId,
    firstName: doc.firstName,
    lastName: doc.lastName,
    name: contactName(doc),
    email: doc.email,
    phone: doc.phone,
    title: doc.title,
    seniority: doc.seniority,
    function: doc.function,
    linkedinUrl: doc.linkedinUrl,
    twitterUrl: doc.twitterUrl,
    githubUrl: doc.githubUrl,
    imageUrl: doc.imageUrl,
    enrichmentStatus: doc.enrichmentStatus,
    companyId: doc.companyId,
    ownerId: doc.ownerId,
    source: doc.source,
    lastActivityAt: doc.lastActivityAt?.toISOString() ?? null,
    archivedAt: doc.archivedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}