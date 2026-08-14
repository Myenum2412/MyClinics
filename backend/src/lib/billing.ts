export const BILL_STATUSES = ["paid", "pending", "cancelled"] as const;

export const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Insurance", "Other"] as const;

export type BillStatus = (typeof BILL_STATUSES)[number];

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatINR(value: number) {
  return inrFormatter.format(Number.isFinite(value) ? value : 0);
}

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
