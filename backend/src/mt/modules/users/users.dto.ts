import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.email("A valid email is required").transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  role: z.enum(["staff", "patient"]),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userIdParamsSchema = z.object({
  userId: z.string().regex(/^usr_[A-Za-z0-9]{8,40}$/, "Invalid user id"),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
