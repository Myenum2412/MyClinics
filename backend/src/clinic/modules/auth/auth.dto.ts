import { z } from "zod";

const NAME_MAX = 120;
const PHONE_MAX = 30;
const EMAIL_MAX = 120;
const PASSWORD_MIN = 8;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address")
  .max(EMAIL_MAX);

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .max(200);

export const signupSchema = z.object({
  clinicName: z.string().trim().min(2, "Clinic name is required").max(NAME_MAX),
  adminName: z.string().trim().min(2, "Admin name is required").max(NAME_MAX),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().max(PHONE_MAX).optional().nullable(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const googleSignupSchema = z.object({
  clinicName: z.string().trim().min(2, "Clinic name is required").max(NAME_MAX),
  adminName: z.string().trim().min(2, "Admin name is required").max(NAME_MAX),
  gticket: z.string().min(1, "Google sign-in session is required"),
});

export type GoogleSignupInput = z.infer<typeof googleSignupSchema>;

export const loginSchema = z.object({
  // Legacy email-only field (kept for backward compat).
  email: emailSchema.optional(),
  // Preferred login identifier: email OR mobile/WhatsApp number.
  identifier: z.string().trim().min(1, "Email or WhatsApp number is required").max(150).optional(),
  password: z.string().min(1, "Password is required").max(200),
  // Optional disambiguator when several portal accounts share one number
  // (e.g. a family contact). When omitted and several accounts match the
  // same number + password, login asks for email instead.
  clinicId: z.string().trim().min(1).max(80).optional(),
}).refine((v) => Boolean(v.email || v.identifier), {
  message: "Email or WhatsApp number is required",
  path: ["identifier"],
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  token: z.string().min(1),
});

export type RefreshInput = z.infer<typeof refreshSchema>;
