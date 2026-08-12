import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { Document } from "mongodb";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { auth } from "@/lib/auth";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export type ReportFileDoc = {
  id: string;
  name: string;
  key: string;
  size: number;
  type: string;
  extension: string;
  folderId: string | null;
  category: string | null;
  patientId: string | null;
  patientName: string | null;
  prescriptionId: string | null;
  prescriptionLabel: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapFile(d: Document): ReportFileDoc {
  return {
    id: (d._id as ObjectId).toString(),
    name: String(d.name ?? ""),
    key: String(d.key ?? ""),
    size: Number(d.size ?? 0),
    type: String(d.type ?? ""),
    extension: String(d.extension ?? ""),
    folderId: d.folderId ? String(d.folderId) : null,
    category: d.category ? String(d.category) : null,
    patientId: d.patientId ? String(d.patientId) : null,
    patientName: d.patientName ? String(d.patientName) : null,
    prescriptionId: d.prescriptionId ? String(d.prescriptionId) : null,
    prescriptionLabel: d.prescriptionLabel ? String(d.prescriptionLabel) : null,
    uploadedBy: d.uploadedBy ? String(d.uploadedBy) : null,
    createdAt: (d.createdAt as Date).toISOString(),
    updatedAt: ((d.updatedAt as Date) ?? (d.createdAt as Date)).toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folder") || null;
    const patientId = searchParams.get("patient") || null;
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const db = await getDb();
    const query: Record<string, unknown> = {};
    if (folderId) query.folderId = folderId;
    if (patientId) query.patientId = patientId;
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { patientName: { $regex: q, $options: "i" } },
      ];
    }

    const docs = await db
      .collection("reports")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ files: docs.map(mapFile) });
  } catch (error) {
    console.error("List reports error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 50 MB." },
        { status: 400 }
      );
    }

    const folderId =
      typeof formData.get("folderId") === "string" && formData.get("folderId")
        ? (formData.get("folderId") as string)
        : null;
    const category =
      typeof formData.get("category") === "string" && formData.get("category")
        ? (formData.get("category") as string)
        : null;
    const patientId =
      typeof formData.get("patientId") === "string" && formData.get("patientId")
        ? (formData.get("patientId") as string)
        : null;
    const patientName =
      typeof formData.get("patientName") === "string" && formData.get("patientName")
        ? (formData.get("patientName") as string)
        : null;
    const prescriptionId =
      typeof formData.get("prescriptionId") === "string" &&
      formData.get("prescriptionId")
        ? (formData.get("prescriptionId") as string)
        : null;
    const prescriptionLabel =
      typeof formData.get("prescriptionLabel") === "string" &&
      formData.get("prescriptionLabel")
        ? (formData.get("prescriptionLabel") as string)
        : null;

    const name = file.name;
    const type = file.type || "application/octet-stream";
    const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";

    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `reports/${randomUUID()}-${safeName}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    await uploadToR2(key, bytes, type);

    const db = await getDb();
    const result = await db.collection("reports").insertOne({
      name,
      key,
      size: file.size,
      type,
      extension: ext,
      folderId,
      category,
      patientId,
      patientName,
      prescriptionId,
      prescriptionLabel,
      uploadedBy: session?.user?.name ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const doc = await db.collection("reports").findOne({ _id: result.insertedId });

    let patientPhone: string | null = null;
    if (patientId) {
      const patient = await db.collection("patients").findOne({ _id: new ObjectId(patientId) });
      if (patient) patientPhone = patient.whatsapp ?? patient.mobile ?? null;
    }
    if (patientPhone) {
      await enqueueClinicNotification(
        db,
        patientPhone,
        `Hi ${patientName ?? "there"}, your report "${name}" has been uploaded. ` +
          `You can view and download it from your patient portal.`,
        "report"
      );
    }

    return NextResponse.json({ file: doc ? mapFile(doc) : null }, { status: 201 });
  } catch (error) {
    console.error("Upload report error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
