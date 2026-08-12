import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";

export async function GET() {
  try {
    const db = await getDb();
    const medicines = await db
      .collection(DB_COLLECTIONS.medicines)
      .find({})
      .sort({ name: 1 })
      .toArray();

    const data = medicines.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      category: m.category ?? null,
      notes: m.notes ?? null,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ medicines: data });
  } catch (error) {
    console.error("List medicines error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Medicine name is required" }, { status: 400 });
    }

    const db = await getDb();
    const medicines = db.collection(DB_COLLECTIONS.medicines);

    const existing = await medicines.findOne({
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This medicine is already in the list" },
        { status: 409 }
      );
    }

    const result = await medicines.insertOne({
      name: name.trim(),
      category: category?.trim() || null,
      notes: notes?.trim() || null,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        medicine: {
          id: result.insertedId.toString(),
          name: name.trim(),
          category: category?.trim() || null,
          notes: notes?.trim() || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create medicine error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
