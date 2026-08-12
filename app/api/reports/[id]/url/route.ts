import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getDownloadUrl } from "@/lib/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db.collection("reports").findOne({ _id: new ObjectId(id) });
    if (!doc || !doc.key) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const url = await getDownloadUrl(doc.key);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Get report url error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
