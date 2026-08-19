import type { ClinicDocument } from "@/clinic/core/repository";

export const BILL_STATUSES = ["draft", "issued", "paid", "void"] as const;
export const PAYMENT_TYPES = ["cash", "upi", "card", "other"] as const;
export const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;

export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
  lineTotal: number;
}

export interface BillDoc extends ClinicDocument {
  clinicId: string;
  billId: string;
  /** Human-readable sequential number per clinic (B-2026-0001). */
  billNumber: string;
  patientId: string;
  doctorId: string | null;
  items: BillItem[];
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  status: (typeof BILL_STATUSES)[number];
  paymentType: (typeof PAYMENT_TYPES)[number] | null;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: (typeof PAYMENT_STATUSES)[number];
  paymentMethod: string | null;
  invoiceDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  /** Notes visible to the patient (shown on the invoice PDF). */
  notes: string | null;
  /** Notes visible only to clinic staff. */
  internalNotes: string | null;
  reference: string | null;
  sendMethod: "whatsapp" | "email" | "none";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface BillTotals {
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
}

/**
 * Computes bill totals from per-item quantities/prices. Each item may carry
 * its own discount and tax %; totals are ALWAYS computed server-side.
 */
export function computeBillTotals(
  items: { quantity: number; unitPrice: number; discount?: number; taxPercent?: number }[]
): BillTotals {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  let discount = 0;
  let taxAmount = 0;
  for (const item of items) {
    const gross = item.quantity * item.unitPrice;
    const itemDiscount = Math.min(Math.max(item.discount ?? 0, 0), gross);
    const taxable = gross - itemDiscount;
    const itemTax = Math.round(taxable * ((item.taxPercent ?? 0) / 100) * 100) / 100;
    discount += itemDiscount;
    taxAmount += itemTax;
  }
  const total = Math.round((subtotal - discount + taxAmount) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    taxPercent: 0,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total,
  };
}

export function derivePaymentStatus(total: number, amountPaid: number): (typeof PAYMENT_STATUSES)[number] {
  if (total <= 0) return "paid";
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= total - 0.01) return "paid";
  return "partial";
}

export function billToPublic(doc: BillDoc) {
  return {
    billId: doc.billId,
    billNumber: doc.billNumber,
    patientId: doc.patientId,
    doctorId: doc.doctorId,
    items: doc.items,
    subtotal: doc.subtotal,
    discount: doc.discount,
    taxPercent: doc.taxPercent,
    taxAmount: doc.taxAmount,
    total: doc.total,
    status: doc.status,
    paymentType: doc.paymentType ?? null,
    amountPaid: doc.amountPaid ?? 0,
    balanceDue: doc.balanceDue ?? (doc.total ?? 0),
    paymentStatus: doc.paymentStatus ?? "unpaid",
    paymentMethod: doc.paymentMethod,
    invoiceDate: doc.invoiceDate ?? doc.createdAt,
    dueDate: doc.dueDate ?? null,
    paidAt: doc.paidAt,
    notes: doc.notes,
    internalNotes: doc.internalNotes ?? null,
    reference: doc.reference ?? null,
    sendMethod: doc.sendMethod ?? "none",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}