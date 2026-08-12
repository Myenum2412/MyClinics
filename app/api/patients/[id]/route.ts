import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }

    const body = await request.json();
    const { fullName, mobile, secondaryMobile, age, gender, whatsapp } = body;

    if (!fullName || !mobile) {
      return NextResponse.json(
        { error: "Full name and mobile number are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection("patients").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          fullName,
          mobile,
          secondaryMobile: secondaryMobile ?? null,
          age: age ?? null,
          gender: gender ?? null,
          whatsapp: whatsapp ?? null,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ patient: { id } });
  } catch (error) {
    console.error("Update patient error", error);
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
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }

    const db = await getDb();
    const patient = await db
      .collection("patients")
      .findOneAndDelete({ _id: new ObjectId(id) });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (patient.userId) {
      await db.collection("users").deleteOne({ _id: patient.userId });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete patient error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
