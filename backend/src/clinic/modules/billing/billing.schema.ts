import type { ClinicDocument } from "@/clinic/core/repository";

export const BILL_STATUSES = ["draft", "issued", "paid", "void"] as const;

export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
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
  paymentMethod: string | null;
  paidAt: Date | null;
  notes: string | null;
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

export function computeBillTotals(
  items: { quantity: number; unitPrice: number }[],
  discount: number,
  taxPercent: number
): BillTotals {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const taxable = subtotal - safeDiscount;
  const taxAmount = Math.round(taxable * (taxPercent / 100) * 100) / 100;
  const total = Math.round((taxable + taxAmount) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(safeDiscount * 100) / 100,
    taxPercent,
    taxAmount,
    total,
  };
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
    paymentMethod: doc.paymentMethod,
    paidAt: doc.paidAt,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}