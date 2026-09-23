import { z } from "zod";

const optionalString = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

export const createLabSchema = z.object({
  labName: z.string().trim().min(2, "Lab name is required").max(120),
  contactPerson: optionalString(120),
  phone: optionalString(30),
  email: optionalString(120),
  address: optionalString(500),
  city: optionalString(120),
  state: optionalString(120),
  pincode: z.string().trim().regex(/^\d{6}$/, "Invalid pincode").optional().nullable(),
  licenseNo: optionalString(120),
  labType: optionalString(120),
  status: z.enum(["active", "inactive"]).optional(),
  password: z.string().min(6).max(100).optional(),
});

export type CreateLabInput = z.infer<typeof createLabSchema>;
export const updateLabSchema = createLabSchema.partial().omit({ password: true });
export type UpdateLabInput = z.infer<typeof updateLabSchema>;

export const listLabsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
