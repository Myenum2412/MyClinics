import { NextResponse } from "next/server";
import type { Document } from "mongodb";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

function mapDoc(d: Document) {
  return {
    id: d._id.toString(),
    patientName: d.patientName,
    age: d.age ?? null,
    gender: d.gender ?? null,
    phone: d.phone ?? null,
    visitDate: d.visitDate,
    diagnosis: d.diagnosis,
    medicines: Array.isArray(d.medicines) ? d.medicines : [],
    symptoms: d.symptoms ?? null,
    testsRecommended: d.testsRecommended ?? null,
    followUpDate: d.followUpDate ?? null,
    doctorName: d.doctorName ?? null,
    createdAt: d.createdAt,
  };
}

export async function GET() {
  try {
    const db = await getDb();
    const prescriptions = await db
      .collection("prescriptions")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ prescriptions: prescriptions.map(mapDoc) });
  } catch (error) {
    console.error("List prescriptions error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
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
    const result = await db.collection("prescriptions").insertOne({
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
      doctorName: session?.user?.name ?? "Doctor",
      createdAt: new Date(),
    });

    return NextResponse.json(
      { prescription: { id: result.insertedId.toString(), patientName } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create prescription error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
