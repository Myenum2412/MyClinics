import { z } from "zod";

const NAME_MAX = 120;
const EMAIL_MAX = 120;
const PHONE_MAX = 30;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const STAFF_POSITIONS = [
  "receptionist",
  "nurse",
  "lab_technician",
  "pharmacist",
  "accountant",
  "manager",
  "other",
] as const;

export const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Staff name is required").max(NAME_MAX),
  position: z.enum(STAFF_POSITIONS, { message: "Invalid staff position" }),
  phone: optionalString(PHONE_MAX),
  email: optionalString(EMAIL_MAX),
  joinedAt: z.string().trim().nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = createStaffSchema.partial();

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const listStaffSchema = z.object({
  q: z.string().trim().max(200).optional(),
  position: z.enum(STAFF_POSITIONS).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});