import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { BOOKING_SOURCES, type BookingSource } from "@/lib/ai-types";
import { reassignCounters } from "@/services/queue.service";
import { enqueueTurnAlertForNextPatient } from "@/services/whatsapp/notification.service";

const TYPES = ["in-person", "video"] as const;

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid appointment id" }, { status: 400 });
    }

    const body = await request.json();
    const {
      fullName,
      mobile,
      secondaryMobile,
      age,
      gender,
      email,
      whatsapp,
      doctorId,
      doctorName,
      department,
      date,
      time,
      type,
      reason,
      status,
      bookingSource,
      notes,
    } = body;

    const hasFullDetails = Boolean(fullName && mobile && doctorId && date && time);

    if (!hasFullDetails && !status) {
      const missing: string[] = [];
      if (!fullName) missing.push("Full name");
      if (!mobile) missing.push("Mobile number");
      if (!doctorId) missing.push("Doctor");
      if (!date) missing.push("Date");
      if (!time) missing.push("Time");
      const message =
        missing.length === 1
          ? `${missing[0]} is required`
          : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]} are required`;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (hasFullDetails && !TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid appointment type" }, { status: 400 });
    }

    const source: BookingSource = BOOKING_SOURCES.includes(bookingSource)
      ? bookingSource
      : "manual";

    const db = await getDb();

    const existing = await db
      .collection("appointments")
      .findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const oldDate = existing.date ? String(existing.date) : "";
    const oldStatus = existing.status ?? "pending";
    const newStatus = hasFullDetails ? (status ?? "pending") : status;

    const update = hasFullDetails
      ? {
          $set: {
            fullName,
            mobile,
            secondaryMobile: secondaryMobile ?? null,
            age: age ?? null,
            gender: gender ?? null,
            email: email ?? null,
            whatsapp: whatsapp ?? null,
            doctorId,
            doctorName: doctorName ?? null,
            department: department ?? null,
            date,
            time,
            type,
            reason: reason ?? null,
            status: status ?? "pending",
            bookingSource: source,
            notes: notes ?? null,
            updatedAt: new Date(),
          },
        }
      : {
          $set: { status, updatedAt: new Date() },
        };

    await db.collection("appointments").updateOne(
      { _id: new ObjectId(id) },
      update
    );

    const affectedDates = new Set([oldDate]);
    if (hasFullDetails && date && date !== oldDate) affectedDates.add(date);
    for (const d of affectedDates) {
      if (d) await reassignCounters(db, d);
    }

    if (newStatus === "completed" && oldStatus !== "completed") {
      await enqueueTurnAlertForNextPatient(db, oldDate || date).catch((err) => {
        console.error("Turn alert enqueue error", err);
      });
    }

    return NextResponse.json({ appointment: { id } });
  } catch (error) {
    console.error("Update appointment error", error);
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
      return NextResponse.json({ error: "Invalid appointment id" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db
      .collection("appointments")
      .findOne({ _id: new ObjectId(id) });

    const result = await db
      .collection("appointments")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const date = existing?.date ? String(existing.date) : "";
    if (date) await reassignCounters(db, date);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete appointment error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
