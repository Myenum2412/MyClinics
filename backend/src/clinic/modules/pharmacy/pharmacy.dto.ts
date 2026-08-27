import { z } from "zod";

// ── Shared primitives ───────────────────────────────────────────────────────

export const PHARMACY_STATUSES = ["active", "inactive"] as const;
export const MEDICINE_STATUSES = ["active", "inactive"] as const;
export const STOCK_STATUSES = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "near_expiry",
  "expired",
] as const;
export const REORDER_STATUSES = ["ok", "reorder"] as const;
export const MOVEMENT_TYPES = [
  "purchase",
  "sale",
  "return",
  "adjustment",
  "transfer",
  "damaged",
  "expired",
  "wastage",
  "correction",
] as const;
export const ADJUSTMENT_STATUSES = ["pending", "approved", "rejected"] as const;
export const TRANSFER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
] as const;
export const RETURN_TYPES = ["supplier_return", "customer_return"] as const;
export const PAYMENT_METHODS = [
  "cash",
  "upi",
  "card",
  "bank_transfer",
  "credit",
  "other",
] as const;
export const PURCHASE_STATUSES = ["draft", "received", "cancelled"] as const;
export const SALE_STATUSES = ["completed", "cancelled", "refunded"] as const;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid YYYY-MM-DD date")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

const optionalString = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional();

const positiveInt = z
  .number()
  .int("Must be a whole number")
  .positive("Must be greater than zero")
  .max(10_000_000);

const nonNegativeInt = z
  .number()
  .int("Must be a whole number")
  .nonnegative("Cannot be negative")
  .max(10_000_000);

const money = z
  .number()
  .nonnegative("Cannot be negative")
  .max(1_000_000_000);

// ── Pharmacy Settings ──────────────────────────────────────────────────────

export const operatingHourSchema = z.object({
  day: z.string().trim().min(1).max(20),
  open: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid open time"),
  close: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid close time"),
  closed: z.boolean(),
});

export const dispensingSettingsSchema = z.object({
  allowSubstitution: z.boolean(),
  requirePrescription: z.boolean(),
  defaultTaxPercent: z.number().min(0).max(100),
  rounding: z.enum(["none", "nearest_rupee"]),
});

export const invoiceConfigSchema = z.object({
  prefix: z.string().trim().min(1).max(20),
  nextNumber: z.number().int().positive(),
  footerNote: optionalString,
});

export const updateSettingsSchema = z.object({
  pharmacyName: z.string().trim().min(1).max(200).optional(),
  registrationNumber: optionalString,
  licenseNumber: optionalString,
  gstNumber: optionalString,
  taxId: optionalString,
  addressLine1: optionalString,
  addressLine2: optionalString,
  city: optionalString,
  state: optionalString,
  country: optionalString,
  pincode: optionalString,
  contactPhone: optionalString,
  contactEmail: z.string().trim().email().nullable().optional()
    .or(z.literal("").transform(() => null))
    .or(z.null()),
  pharmacistName: optionalString,
  pharmacistRegistration: optionalString,
  operatingHours: z.array(operatingHourSchema).max(14).optional(),
  dispensingSettings: dispensingSettingsSchema.optional(),
  invoiceConfig: invoiceConfigSchema.optional(),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).optional(),
  supplierInfo: optionalString,
  pharmacyStatus: z.enum(PHARMACY_STATUSES).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// ── Medicine Master ────────────────────────────────────────────────────────

export const createMedicineSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required").max(200),
  genericName: optionalString,
  brand: optionalString,
  category: optionalString,
  dosageForm: optionalString,
  strength: optionalString,
  unit: optionalString,
  manufacturer: optionalString,
  hsnCode: optionalString,
  barcode: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  batchNumber: optionalString,
  prescriptionRequired: z.boolean().optional().default(false),
  reorderLevel: nonNegativeInt.optional().default(0),
  minStockLevel: nonNegativeInt.optional().default(0),
  maxStockLevel: z
    .number()
    .int()
    .positive()
    .max(10_000_000)
    .nullable()
    .optional(),
  purchasePrice: money.optional().default(0),
  sellingPrice: money.optional().default(0),
  taxPercent: z.number().min(0).max(100).optional().default(0),
  discount: z.number().min(0).max(100).optional().default(0),
  supplierId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  manufacturingDate: dateString,
  expiryDate: dateString,
  storageConditions: optionalString,
  status: z.enum(MEDICINE_STATUSES).optional().default("active"),
});

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;

export const updateMedicineSchema = createMedicineSchema.partial();

export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;

// ── Suppliers ──────────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(200),
  contactPerson: optionalString,
  phone: optionalString,
  email: z.string().trim().email().nullable().optional()
    .or(z.literal("").transform(() => null))
    .or(z.null()),
  address: optionalString,
  gstNumber: optionalString,
  drugLicenseNumber: optionalString,
  paymentTerms: optionalString,
  notes: optionalString,
  status: z.enum(PHARMACY_STATUSES).optional().default("active"),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// ── Inventory (opening stock / batch management) ────────────────────────────

export const openingStockItemSchema = z.object({
  medicineId: z.string().trim().min(1),
  batchNumber: z.string().trim().min(1, "Batch number is required").max(100),
  quantity: positiveInt,
  unitPrice: money.optional().default(0),
  expiryDate: dateString,
  manufacturingDate: dateString,
  supplierId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  storageLocation: optionalString,
});

export const addOpeningStockSchema = z.object({
  items: z.array(openingStockItemSchema).min(1, "At least one item is required").max(500),
  notes: optionalString,
});

export type AddOpeningStockInput = z.infer<typeof addOpeningStockSchema>;

// ── Purchases (procurement / goods receipt) ────────────────────────────────

export const purchaseItemSchema = z.object({
  medicineId: z.string().trim().min(1),
  batchNumber: z.string().trim().min(1, "Batch number is required").max(100),
  quantity: positiveInt,
  unitPrice: money.optional().default(0),
  expiryDate: dateString,
  manufacturingDate: dateString,
  supplierId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  storageLocation: optionalString,
});

export const createPurchaseSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  supplierId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid YYYY-MM-DD date")
    .optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required").max(500),
  notes: optionalString,
  status: z.enum(PURCHASE_STATUSES).optional().default("draft"),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const receivePurchaseSchema = z.object({
  notes: optionalString,
});

// ── Sales (dispensing) ─────────────────────────────────────────────────────

export const saleItemSchema = z.object({
  medicineId: z.string().trim().min(1),
  batchNumber: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  quantity: positiveInt,
  unitPrice: money.optional(),
  discount: z.number().min(0).max(100).optional().default(0),
  taxPercent: z.number().min(0).max(100).optional().default(0),
});

export const createSaleSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  saleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid YYYY-MM-DD date")
    .optional(),
  patientId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  items: z.array(saleItemSchema).min(1, "At least one item is required").max(500),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: optionalString,
  fifo: z.boolean().optional().default(false),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

// ── Stock Adjustments (approval workflow) ──────────────────────────────────

export const createAdjustmentSchema = z.object({
  medicineId: z.string().trim().min(1),
  batchNumber: z.string().trim().min(1).max(100),
  newQuantity: nonNegativeInt,
  reason: z.string().trim().min(1, "Reason is required").max(500),
  notes: optionalString,
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;

export const reviewAdjustmentSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: optionalString,
});

// ── Stock Transfers (between locations) ────────────────────────────────────

export const transferItemSchema = z.object({
  medicineId: z.string().trim().min(1),
  batchNumber: z.string().trim().min(1).max(100),
  quantity: positiveInt,
});

export const createTransferSchema = z.object({
  fromLocation: z.string().trim().min(1, "Source location is required").max(200),
  toLocation: z.string().trim().min(1, "Destination location is required").max(200),
  items: z.array(transferItemSchema).min(1).max(500),
  notes: optionalString,
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const reviewTransferSchema = z.object({
  decision: z.enum(["approved", "rejected", "completed"]),
  notes: optionalString,
});

// ── Returns ─────────────────────────────────────────────────────────────────

export const returnItemSchema = z.object({
  medicineId: z.string().trim().min(1),
  batchNumber: z.string().trim().min(1).max(100),
  quantity: positiveInt,
  reason: optionalString,
});

export const createReturnSchema = z.object({
  type: z.enum(RETURN_TYPES),
  referenceId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  items: z.array(returnItemSchema).min(1).max(500),
  notes: optionalString,
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;

// ── Damaged / Wastage / Expired write-off ──────────────────────────────────

export const writeOffSchema = z.object({
  inventoryId: z.string().trim().min(1, "Select an inventory batch"),
  quantity: positiveInt,
  reason: z.enum(["damaged", "wastage", "expired"], { message: "Reason is required" }),
  notes: optionalString,
});

export type WriteOffInput = z.infer<typeof writeOffSchema>;

// ── List / query schemas ───────────────────────────────────────────────────

export const listMedicinesSchema = z.object({
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  status: z.enum(MEDICINE_STATUSES).optional(),
  supplierId: z.string().trim().min(1).optional(),
});

export const listInventorySchema = z.object({
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  medicineId: z.string().trim().min(1).optional(),
  batchNumber: z.string().trim().max(100).optional(),
  supplierId: z.string().trim().min(1).optional(),
  status: z.enum(STOCK_STATUSES).optional(),
  reorderStatus: z.enum(REORDER_STATUSES).optional(),
  prescriptionRequired: z.boolean().optional(),
  expiryFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy: z
    .enum([
      "name",
      "quantityAvailable",
      "expiryDate",
      "lastUpdated",
      "sellingPrice",
      "reorderLevel",
    ])
    .optional()
    .default("lastUpdated"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const listMovementsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  medicineId: z.string().trim().min(1).optional(),
  batchNumber: z.string().trim().max(100).optional(),
  movementType: z.enum(MOVEMENT_TYPES).optional(),
  referenceInvoice: z.string().trim().max(100).optional(),
  party: z.string().trim().max(200).optional(),
  performedBy: z.string().trim().min(1).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const listPurchasesSchema = z.object({
  supplierId: z.string().trim().min(1).optional(),
  status: z.enum(PURCHASE_STATUSES).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const listSalesSchema = z.object({
  patientId: z.string().trim().min(1).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(SALE_STATUSES).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const reportTypes = [
  "current_stock",
  "stock_movement",
  "batch_wise",
  "expiry",
  "expired",
  "low_stock",
  "purchase",
  "sales",
  "supplier",
  "valuation",
  "wastage",
  "reconciliation",
] as const;

export const reportQuerySchema = z.object({
  type: z.enum(reportTypes),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.enum(["csv", "pdf"]).optional().default("csv"),
  category: z.string().trim().max(100).optional(),
  supplierId: z.string().trim().min(1).optional(),
});

export type ReportType = (typeof reportTypes)[number];

export const bulkActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(["activate", "deactivate", "delete"]),
});

export type BulkActionInput = z.infer<typeof bulkActionSchema>;
