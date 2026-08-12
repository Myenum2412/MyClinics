import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid doctor id" }, { status: 400 });
    }

    const body = await request.json();
    const { name, specialty, mobile, qualifications } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id), role: "doctor" },
      {
        $set: {
          name,
          specialty: specialty ?? null,
          mobile: mobile ?? null,
          qualifications: qualifications ?? null,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ doctor: { id } });
  } catch (error) {
    console.error("Update doctor error", error);
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
      return NextResponse.json({ error: "Invalid doctor id" }, { status: 400 });
    }

    const db = await getDb();
    const doctor = await db
      .collection("users")
      .findOneAndDelete({ _id: new ObjectId(id), role: "doctor" });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete doctor error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
