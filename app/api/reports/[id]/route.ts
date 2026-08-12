import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
    }

    const body = await request.json();
    const db = await getDb();
    const collection = db.collection("reports");

    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.name === "string" && body.name.trim()) {
      update.name = body.name.trim();
    }
    if (typeof body.folderId === "string") {
      update.folderId = body.folderId || null;
    }
    if (typeof body.category === "string") {
      update.category = body.category || null;
    }
    if (typeof body.patientId === "string" || body.patientId === null) {
      update.patientId = body.patientId;
      update.patientName =
        typeof body.patientName === "string" ? body.patientName : null;
    }
    if (typeof body.prescriptionId === "string" || body.prescriptionId === null) {
      update.prescriptionId = body.prescriptionId;
      update.prescriptionLabel =
        typeof body.prescriptionLabel === "string" ? body.prescriptionLabel : null;
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      file: {
        id: result!._id.toString(),
        name: result!.name,
        key: result!.key,
        size: result!.size,
        type: result!.type,
        extension: result!.extension ?? "",
        folderId: result!.folderId ?? null,
        category: result!.category ?? null,
        patientId: result!.patientId ?? null,
        patientName: result!.patientName ?? null,
        prescriptionId: result!.prescriptionId ?? null,
        prescriptionLabel: result!.prescriptionLabel ?? null,
        uploadedBy: result!.uploadedBy ?? null,
        createdAt: result!.createdAt.toISOString(),
        updatedAt: (result!.updatedAt ?? result!.createdAt).toISOString(),
      },
    });
  } catch (error) {
    console.error("Update report error", error);
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
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("reports");

    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (doc.key) {
      try {
        await deleteFromR2(doc.key);
      } catch (error) {
        console.error("Delete R2 object error", error);
      }
    }
    await collection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete report error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
