import type { ClinicDocument } from "@/clinic/core/repository";

/**
 * Lead entity — owned by the core CRM.
 *
 * Meta leads are a source feeding this entity; the Meta-specific attribution
 * lives in `meta_lead_attributions` and is linked by `leadId`. A lead can also
 * be created manually, so `source` distinguishes origins and `sourceRef`
 * provides stable de-duplication for automated sources.
 */

export type LeadSource = "meta_facebook" | "meta_instagram" | "manual" | "other";
export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "appointment"
  | "converted"
  | "lost";
export type LeadPriority = "low" | "normal" | "high";

export interface LeadDoc extends ClinicDocument {
  clinicId: string;
  leadId: string;
  source: LeadSource;
  /** Stable de-duplication key (e.g. `meta:<metaLeadId>`). Null for manual. */
  sourceRef: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  formAnswers: Record<string, string>;
  consent: Record<string, unknown> | null;
  status: LeadStatus;
  priority: LeadPriority;
  department: string | null;
  service: string | null;
  team: string | null;
  assignedTo: string | null;
  assignedAt: Date | null;
  /** Response workflow tracking (section 38). */
  receivedAt: Date;
  firstResponseAt: Date | null;
  firstContactAt: Date | null;
  contactAttempts: number;
  appointmentBookedAt: Date | null;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function leadToPublic(doc: LeadDoc) {
  return {
    leadId: doc.leadId,
    source: doc.source,
    sourceRef: doc.sourceRef,
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    formAnswers: doc.formAnswers,
    consent: doc.consent,
    status: doc.status,
    priority: doc.priority,
    department: doc.department,
    service: doc.service,
    team: doc.team,
    assignedTo: doc.assignedTo,
    assignedAt: doc.assignedAt,
    receivedAt: doc.receivedAt,
    firstResponseAt: doc.firstResponseAt,
    firstContactAt: doc.firstContactAt,
    contactAttempts: doc.contactAttempts,
    appointmentBookedAt: doc.appointmentBookedAt,
    convertedAt: doc.convertedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
