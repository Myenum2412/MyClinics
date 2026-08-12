import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    const patients = await db
      .collection("patients")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const data = patients.map((p) => ({
      id: p._id.toString(),
      fullName: p.fullName,
      mobile: p.mobile,
      secondaryMobile: p.secondaryMobile ?? null,
      age: p.age,
      gender: p.gender,
      email: p.email,
      whatsapp: p.whatsapp ?? null,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ patients: data });
  } catch (error) {
    console.error("List patients error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, mobile, secondaryMobile, age, gender, email, password, whatsapp } =
      body;

    if (!fullName || !mobile) {
      return NextResponse.json(
        { error: "Full name and mobile number are required" },
        { status: 400 }
      );
    }
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required to create the patient account" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const users = db.collection("users");
    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await users.insertOne({
      name: fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "patient",
      image: null,
      createdAt: new Date(),
    });

    const patientResult = await db.collection("patients").insertOne({
      fullName,
      mobile,
      secondaryMobile: secondaryMobile ?? null,
      age: age ?? null,
      gender: gender ?? null,
      email: email.toLowerCase(),
      whatsapp: whatsapp ?? null,
      userId: userResult.insertedId,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        patient: {
          id: patientResult.insertedId.toString(),
          userId: userResult.insertedId.toString(),
          fullName,
          mobile,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create patient error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
