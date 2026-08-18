import { z } from "zod";

export const BILL_STATUSES = ["draft", "issued", "paid", "void"] as const;

const billItemSchema = z.object({
  description: z.string().trim().min(1, "Item description is required").max(500),
  quantity: z.number().positive("Quantity must be positive").max(10_000),
  unitPrice: z.number().nonnegative("Unit price cannot be negative").max(1_000_000_000),
});

export const createBillSchema = z.object({
  patientId: z.string().startsWith("pat_"),
  doctorId: z.string().startsWith("doc_").nullable().optional(),
  items: z.array(billItemSchema).min(1, "At least one item is required").max(100),
  discount: z.number().nonnegative().max(1_000_000_000).optional().default(0),
  taxPercent: z.number().nonnegative().max(100).optional().default(0),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(["draft", "issued", "paid"]).optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;

export const updateBillSchema = z.object({
  items: z.array(billItemSchema).min(1).max(100).optional(),
  discount: z.number().nonnegative().max(1_000_000_000).optional(),
  taxPercent: z.number().nonnegative().max(100).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(BILL_STATUSES).optional(),
  paymentMethod: z.string().trim().max(120).nullable().optional(),
});

export type UpdateBillInput = z.infer<typeof updateBillSchema>;

export const listBillsSchema = z.object({
  patientId: z.string().startsWith("pat_").optional(),
  status: z.enum(BILL_STATUSES).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});