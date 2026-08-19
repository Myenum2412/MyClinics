import { z } from "zod";

export const updateSettingsSchema = z.object({
  workingHours: z
    .object({
      open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid open time"),
      close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid close time"),
    })
    .optional(),
  slotMinutes: z.number().int().min(5).max(240).optional(),
  currency: z.string().trim().min(3).max(8).optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
  receiptFooter: z.string().trim().max(500).nullable().optional(),
  smsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  lookups: z
    .record(
      z.string().trim().min(1).max(40),
      z.array(z.string().trim().min(1).max(80)).max(500)
    )
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const DEFAULT_SETTINGS = {
  workingHours: { open: "09:00", close: "18:00" },
  slotMinutes: 30,
  currency: "INR",
  timezone: "Asia/Kolkata",
  receiptFooter: null,
  smsEnabled: false,
  emailNotifications: false,
  lookups: {} as Record<string, string[]>,
} as const;