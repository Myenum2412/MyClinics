import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();
    const doctors = await db
      .collection("users")
      .find({ role: "doctor" })
      .sort({ createdAt: -1 })
      .toArray();

    const data = doctors.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      email: d.email,
      specialty: d.specialty ?? null,
      mobile: d.mobile ?? null,
      qualifications: d.qualifications ?? null,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({ doctors: data });
  } catch (error) {
    console.error("List doctors error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, specialty, mobile, qualifications } = body;

    if (!name || !email || !password) {
      const missing: string[] = [];
      if (!name) missing.push("Name");
      if (!email) missing.push("Email");
      if (!password) missing.push("Password");
      const message =
        missing.length === 1
          ? `${missing[0]} is required`
          : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]} are required`;
      return NextResponse.json({ error: message }, { status: 400 });
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
    const result = await users.insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      specialty: specialty ?? null,
      mobile: mobile ?? null,
      qualifications: qualifications ?? null,
      role: "doctor",
      image: null,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        doctor: {
          id: result.insertedId.toString(),
          name,
          email: email.toLowerCase(),
          specialty: specialty ?? null,
          mobile: mobile ?? null,
          qualifications: qualifications ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create doctor error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
