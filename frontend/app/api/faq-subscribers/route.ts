import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const consent = Boolean(body?.consent);
    const source = typeof body?.source === "string" ? body.source.trim() : "FAQ Page";

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("faq_subscribers");

    const now = new Date();
    await collection.updateOne(
      { email: rawEmail },
      {
        $set: {
          email: rawEmail,
          consent,
          source,
          updatedAt: now,
          status: "subscribed",
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "You're subscribed! Our clinical team will reach out soon.",
    });
  } catch (error) {
    console.error("Failed to save FAQ subscriber:", error);
    return NextResponse.json(
      { error: "Failed to save subscription. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().toLowerCase();

    const db = await getDb();
    const collection = db.collection("faq_subscribers");

    const query: Record<string, unknown> = {};
    if (q) {
      query.email = { $regex: q, $options: "i" };
    }

    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const items = docs.map((doc) => ({
      id: doc._id.toString(),
      email: doc.email,
      consent: doc.consent ?? false,
      source: doc.source ?? "FAQ Page",
      status: doc.status ?? "subscribed",
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Failed to fetch FAQ subscribers:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing subscriber ID" }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("faq_subscribers");

    let query: Record<string, unknown> = { email: id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { email: id }] };
    }

    await collection.deleteOne(query);
    return NextResponse.json({ success: true, message: "Subscriber deleted" });
  } catch (error) {
    console.error("Failed to delete FAQ subscriber:", error);
    return NextResponse.json(
      { error: "Failed to delete subscriber" },
      { status: 500 }
    );
  }
}
