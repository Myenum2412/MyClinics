import { z } from "zod";

const NAME_MAX = 120;
const PHONE_MAX = 30;
const EMAIL_MAX = 120;
const ADDRESS_MAX = 300;
const WEBSITE_MAX = 120;
const DESCRIPTION_MAX = 500;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const createClinicSchema = z.object({
  name: z.string().trim().min(2, "Clinic name is required").max(NAME_MAX),
  adminName: z.string().trim().min(2, "Admin name is required").max(NAME_MAX),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
  phone: optionalString(PHONE_MAX),
});

export type CreateClinicInput = z.infer<typeof createClinicSchema>;

export const updateClinicSchema = z.object({
  name: z.string().trim().min(2).max(NAME_MAX).optional(),
  phone: optionalString(PHONE_MAX),
  email: optionalString(EMAIL_MAX),
  address: optionalString(ADDRESS_MAX),
  website: optionalString(WEBSITE_MAX),
  description: optionalString(DESCRIPTION_MAX),
  status: z.enum(["active", "suspended"]).optional(),
  settings: z
    .object({
      workingHours: z
        .object({
          open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid open time"),
          close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid close time"),
        })
        .optional(),
      slotMinutes: z.number().int().min(5).max(240).optional(),
      currency: z.string().trim().min(3).max(8).optional(),
      timezone: z.string().trim().min(1).max(60).optional(),
    })
    .optional(),
});

export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;
