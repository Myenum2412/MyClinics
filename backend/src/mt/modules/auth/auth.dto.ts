import { z } from "zod";

export const signupSchema = z.object({
  clinicName: z.string().trim().min(2, "Clinic name must be at least 2 characters").max(100),
  adminName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.email("A valid email is required").transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Phone must be 10-15 digits, optionally prefixed with +")
    .optional()
    .nullable(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.email("A valid email is required").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required").max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

export const signupResponseSchema = z.object({
  clinicId: z.string(),
  clinicName: z.string(),
  slug: z.string(),
  userId: z.string(),
  role: z.literal("clinic_admin"),
  token: z.string(),
  tokenExpiresInSeconds: z.number(),
});

export type SignupResponse = z.infer<typeof signupResponseSchema>;

export const loginResponseSchema = z.object({
  userId: z.string(),
  clinicId: z.string(),
  clinicName: z.string().nullable(),
  role: z.enum(["clinic_admin", "staff", "patient"]),
  name: z.string().nullable(),
  email: z.string().nullable(),
  patientId: z.string().nullable(),
  token: z.string(),
  tokenExpiresInSeconds: z.number(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;