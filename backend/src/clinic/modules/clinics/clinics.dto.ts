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

const optionalStringList = z
  .array(z.string().trim().min(1).max(60))
  .max(20)
  .nullable()
  .optional();

export const clinicProfileSchema = z.object({
  clinicType: optionalString(60),
  registrationNumber: optionalString(60),
  establishedYear: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .nullable()
    .optional(),
  whatsapp: optionalString(PHONE_MAX),
  addressLine1: optionalString(ADDRESS_MAX),
  addressLine2: optionalString(ADDRESS_MAX),
  city: optionalString(80),
  state: optionalString(80),
  country: optionalString(80),
  pincode: optionalString(10),
  specializations: optionalStringList,
  services: optionalStringList,
  emergencyContact: optionalString(PHONE_MAX),
  gstNumber: optionalString(30),
  taxBusinessId: optionalString(60),
  socialMedia: z
    .object({
      facebook: optionalString(200),
      instagram: optionalString(200),
      twitter: optionalString(200),
      linkedin: optionalString(200),
    })
    .optional(),
});

export const weeklyScheduleDaySchema = z.object({
  day: z.string().trim().min(1).max(20),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid open time"),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid close time"),
  closed: z.boolean(),
});

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
          days: z.string().trim().max(100).nullable().optional(),
        })
        .optional(),
      slotMinutes: z.number().int().min(5).max(240).optional(),
      currency: z.string().trim().min(3).max(8).optional(),
      timezone: z.string().trim().min(1).max(60).optional(),
      weeklySchedule: z.array(weeklyScheduleDaySchema).max(7).optional(),
    })
    .optional(),
  profile: clinicProfileSchema.optional(),
});

export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;
