import { z } from "zod";

const NAME_MAX = 120;
const EMAIL_MAX = 120;
const PHONE_MAX = 30;

const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const scheduleEntrySchema = z
  .object({
    day: z.enum(SCHEDULE_DAYS),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid start time"),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid end time"),
  })
  .refine((s) => s.end > s.start, {
    message: "End time must be after start time",
    path: ["end"],
  });

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, "Doctor name is required").max(NAME_MAX),
  specialization: z.string().trim().min(2, "Specialization is required").max(120),
  licenseNo: optionalString(120),
  qualification: optionalString(200),
  phone: optionalString(PHONE_MAX),
  whatsapp: optionalString(PHONE_MAX),
  email: optionalString(EMAIL_MAX),
  fee: z.number().nonnegative().max(1_000_000).optional().nullable(),
  schedule: z.array(scheduleEntrySchema).max(7).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  // Extended profile fields (all optional — backfilled on create only).
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional().nullable(),
  nationality: optionalString(120),
  address: optionalString(500),
  city: optionalString(120),
  state: optionalString(120),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Invalid pincode")
    .optional()
    .nullable(),
  experienceYears: z.number().int().min(0).max(100).optional().nullable(),
  registrationNo: optionalString(120),
  issuingAuthority: optionalString(200),
  department: optionalString(120),
  about: optionalString(2000),
  languages: optionalString(500),
  notes: optionalString(2000),
  username: optionalString(120),
  allowLogin: z.boolean().optional().nullable(),
  profileImage: optionalString(255),
  scheduleDays: z.array(z.enum(SCHEDULE_DAYS)).max(7).optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = createDoctorSchema.partial();

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const listDoctorsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  specialization: z.string().trim().max(120).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});