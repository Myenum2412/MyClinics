import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prescription id" }, { status: 400 });
    }

    const body = await request.json();
    const {
      patientName,
      age,
      gender,
      phone,
      visitDate,
      diagnosis,
      medicines,
      symptoms,
      testsRecommended,
      followUpDate,
    } = body;

    if (!patientName || !diagnosis) {
      return NextResponse.json(
        { error: "Patient name and diagnosis are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection("prescriptions").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          patientName,
          age: age ?? null,
          gender: gender ?? null,
          phone: phone ?? null,
          visitDate: visitDate ?? null,
          diagnosis,
          medicines: Array.isArray(medicines) ? medicines : [],
          symptoms: symptoms ?? null,
          testsRecommended: testsRecommended ?? null,
          followUpDate: followUpDate ?? null,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update prescription error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prescription id" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("prescriptions").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete prescription error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
