import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid medicine id" }, { status: 400 });
    }

    const body = await request.json();
    const { name, category, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Medicine name is required" }, { status: 400 });
    }

    const db = await getDb();
    const medicines = db.collection(DB_COLLECTIONS.medicines);

    const existing = await medicines.findOne({
      _id: { $ne: new ObjectId(id) },
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This medicine is already in the list" },
        { status: 409 }
      );
    }

    const result = await medicines.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: name.trim(),
          category: category?.trim() || null,
          notes: notes?.trim() || null,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    return NextResponse.json({ medicine: { id } });
  } catch (error) {
    console.error("Update medicine error", error);
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
      return NextResponse.json({ error: "Invalid medicine id" }, { status: 400 });
    }

    const db = await getDb();
    const medicine = await db
      .collection(DB_COLLECTIONS.medicines)
      .findOneAndDelete({ _id: new ObjectId(id) });

    if (!medicine) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete medicine error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
