import { NextResponse } from "next/server";
import type { Document } from "mongodb";
import { getDb } from "@/lib/db";
import { auth, canAccessBilling } from "@/lib/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { BILL_STATUSES, PAYMENT_METHODS, round2 } from "@/lib/billing";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";

export type BillItemInput = {
  name: string;
  qty: number;
  price: number;
};

export function mapBill(d: Document) {
  return {
    id: d._id.toString(),
    billNumber: d.billNumber,
    patientName: d.patientName,
    patientPhone: d.patientPhone ?? null,
    doctorId: d.doctorId ?? null,
    doctorName: d.doctorName ?? null,
    date: d.date,
    items: Array.isArray(d.items) ? d.items : [],
    subtotal: d.subtotal ?? 0,
    discount: d.discount ?? 0,
    taxRate: d.taxRate ?? 0,
    tax: d.tax ?? 0,
    total: d.total ?? 0,
    paymentMethod: d.paymentMethod ?? "Cash",
    status: d.status ?? "pending",
    notes: d.notes ?? null,
    createdAt: d.createdAt,
  };
}

export function computeBillTotals(items: BillItemInput[], discount = 0, taxRate = 0) {
  const subtotal = round2(
    items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0)
  );
  const safeDiscount = round2(Math.max(0, Number(discount) || 0));
  const safeTaxRate = Math.max(0, Number(taxRate) || 0);
  const taxable = Math.max(0, subtotal - safeDiscount);
  const tax = round2((taxable * safeTaxRate) / 100);
  const total = round2(taxable + tax);
  return { subtotal, discount: safeDiscount, taxRate: safeTaxRate, tax, total };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !canAccessBilling(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const bills = await db
      .collection(DB_COLLECTIONS.bills)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json({ bills: bills.map(mapBill) });
  } catch (error) {
    console.error("List bills error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !canAccessBilling(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      patientName,
      patientPhone,
      date,
      items,
      discount,
      taxRate,
      paymentMethod,
      status,
      notes,
    } = body;

    const cleanItems: BillItemInput[] = Array.isArray(items)
      ? items.filter((i) => i && (i.name || "").trim() && (Number(i.qty) > 0 || Number(i.price) > 0))
      : [];

    if (!patientName || !patientName.trim()) {
      return NextResponse.json(
        { error: "Patient name is required" },
        { status: 400 }
      );
    }
    if (!cleanItems.length) {
      return NextResponse.json(
        { error: "Add at least one bill item" },
        { status: 400 }
      );
    }

    const totals = computeBillTotals(
      cleanItems,
      Number(discount) || 0,
      Number(taxRate) || 0
    );

    const db = await getDb();
    const count = await db
      .collection(DB_COLLECTIONS.bills)
      .countDocuments({});
    const billNumber = `INV-${String(count + 1).padStart(4, "0")}`;

    const result = await db.collection(DB_COLLECTIONS.bills).insertOne({
      billNumber,
      patientName: patientName.trim(),
      patientPhone: patientPhone?.trim() || null,
      doctorId: session?.user?.id ?? null,
      doctorName: session?.user?.name ?? "Doctor",
      date: date ?? new Date().toISOString().slice(0, 10),
      items: cleanItems.map((i) => ({
        name: (i.name || "").trim(),
        qty: Number(i.qty) || 0,
        price: Number(i.price) || 0,
        amount: round2((Number(i.qty) || 0) * (Number(i.price) || 0)),
      })),
      ...totals,
      paymentMethod: PAYMENT_METHODS.includes(paymentMethod)
        ? paymentMethod
        : "Cash",
      status: BILL_STATUSES.includes(status) ? status : "pending",
      notes: notes?.trim() || null,
      createdAt: new Date(),
    });

    if (patientPhone?.trim()) {
      await enqueueClinicNotification(
        db,
        patientPhone.trim(),
        `Hi ${patientName.trim()}, your bill ${billNumber} is ₹${totals.total.toLocaleString("en-IN")}. ` +
          `Please complete payment at your convenience.`,
        "bill"
      );
    }

    return NextResponse.json(
      { bill: { id: result.insertedId.toString(), billNumber, ...totals } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create bill error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
