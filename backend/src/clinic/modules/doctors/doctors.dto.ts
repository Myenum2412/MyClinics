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
  email: optionalString(EMAIL_MAX),
  fee: z.number().nonnegative().max(1_000_000).optional().nullable(),
  schedule: z.array(scheduleEntrySchema).max(7).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = createDoctorSchema.partial();

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const listDoctorsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  specialization: z.string().trim().max(120).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});