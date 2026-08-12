import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DB_COLLECTIONS } from "@/lib/constants";

const NAME_MAX = 100;
const PHONE_MAX = 30;
const SPECIALIZATION_MAX = 100;
const QUALIFICATIONS_MAX = 200;
const BIO_MAX = 1000;

export function mapUser(d: { _id: { toString(): string }; [k: string]: unknown }) {
  return {
    id: d._id.toString(),
    name: d.name ?? null,
    email: d.email ?? null,
    role: d.role ?? "doctor",
    image: d.image ?? null,
    phone: d.phone ?? null,
    specialization: d.specialization ?? null,
    qualifications: d.qualifications ?? null,
    bio: d.bio ?? null,
    createdAt: d.createdAt ?? null,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const user = await db
      .collection(DB_COLLECTIONS.users)
      .findOne({ _id: new ObjectId(session.user.id) });

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ user: mapUser(user as never) });
  } catch (error) {
    console.error("Get profile error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (name.length > NAME_MAX) {
      return NextResponse.json(
        { error: `Name must be under ${NAME_MAX} characters` },
        { status: 400 }
      );
    }

    const phone =
      typeof body?.phone === "string" && body.phone.trim()
        ? body.phone.trim().slice(0, PHONE_MAX)
        : null;
    const specialization =
      typeof body?.specialization === "string" && body.specialization.trim()
        ? body.specialization.trim().slice(0, SPECIALIZATION_MAX)
        : null;
    const qualifications =
      typeof body?.qualifications === "string" && body.qualifications.trim()
        ? body.qualifications.trim().slice(0, QUALIFICATIONS_MAX)
        : null;
    const bio =
      typeof body?.bio === "string" && body.bio.trim()
        ? body.bio.trim().slice(0, BIO_MAX)
        : null;

    const db = await getDb();
    const result = await db.collection(DB_COLLECTIONS.users).updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          name,
          phone,
          specialization,
          qualifications,
          bio,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const updated = await db
      .collection(DB_COLLECTIONS.users)
      .findOne({ _id: new ObjectId(session.user.id) });

    return NextResponse.json({ user: mapUser(updated as never) });
  } catch (error) {
    console.error("Update profile error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
