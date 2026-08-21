import type { ClinicDocument } from "@/clinic/core/repository";

export interface ClinicSettingsDoc extends ClinicDocument {
  clinicId: string;
  workingHours: { open: string; close: string };
  slotMinutes: number;
  currency: string;
  timezone: string;
  receiptFooter: string | null;
  smsEnabled: boolean;
  emailNotifications: boolean;
  lookups: Record<string, string[]>;
  gstin?: string | null;
  udyam?: string | null;
  termsAndConditions?: string | null;
  upiId?: string | null;
  qrCodeUrl?: string | null;
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
    smsEnabled: doc.smsEnabled,
    emailNotifications: doc.emailNotifications,
    lookups: doc.lookups ?? {},
    gstin: doc.gstin ?? null,
    udyam: doc.udyam ?? null,
    termsAndConditions: doc.termsAndConditions ?? null,
    upiId: doc.upiId ?? null,
    qrCodeUrl: doc.qrCodeUrl ?? null,
    updatedAt: doc.updatedAt,
  };
}