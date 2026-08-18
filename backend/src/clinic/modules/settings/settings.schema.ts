import type { ClinicDocument } from "@/clinic/core/repository";

export interface ClinicSettingsDoc extends ClinicDocument {
  clinicId: string;
  workingHours: { open: string; close: string };
  slotMinutes: number;
  currency: string;
  timezone: string;
  receiptFooter: string | null;
  soulMd: string | null;
  smsEnabled: boolean;
  emailNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function settingsToPublic(doc: ClinicSettingsDoc) {
  return {
    workingHours: doc.workingHours,
    slotMinutes: doc.slotMinutes,
    currency: doc.currency,
    timezone: doc.timezone,
    receiptFooter: doc.receiptFooter,
    soulMd: doc.soulMd,
    smsEnabled: doc.smsEnabled,
    emailNotifications: doc.emailNotifications,
    updatedAt: doc.updatedAt,
  };
}