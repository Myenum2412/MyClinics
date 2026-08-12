import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { auth, canAccessBilling } from "@/lib/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { BILL_STATUSES, PAYMENT_METHODS, round2 } from "@/lib/billing";
import { computeBillTotals } from "@/app/api/bills/route";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid bill id" }, { status: 400 });
    }

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

    const cleanItems = Array.isArray(items)
      ? items.filter(
          (i) =>
            i &&
            (i.name || "").trim() &&
            (Number(i.qty) > 0 || Number(i.price) > 0)
        )
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
    const result = await db.collection(DB_COLLECTIONS.bills).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
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
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ bill: { id, ...totals } });
  } catch (error) {
    console.error("Update bill error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid bill id" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user || !canAccessBilling(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const result = await db
      .collection(DB_COLLECTIONS.bills)
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete bill error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
