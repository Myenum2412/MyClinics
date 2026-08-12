import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { BOOKING_SOURCES, type BookingSource } from "@/lib/ai-types";
import { reassignCounters } from "@/services/queue.service";

const TYPES = ["in-person", "video"] as const;

export async function GET() {
  try {
    const db = await getDb();
    const appointments = await db
      .collection("appointments")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const data = appointments.map((a) => ({
      id: a._id.toString(),
      fullName: a.fullName,
      mobile: a.mobile,
      secondaryMobile: a.secondaryMobile ?? null,
      age: a.age,
      gender: a.gender,
      email: a.email,
      whatsapp: a.whatsapp ?? null,
      doctorId: a.doctorId?.toString() ?? null,
      doctorName: a.doctorName,
      department: a.department,
      date: a.date,
      time: a.time,
      type: a.type,
      reason: a.reason,
      status: a.status,
      bookingSource: (a.bookingSource ?? "manual") as BookingSource,
      notes: a.notes ?? null,
      whatsappConversationId: a.whatsappConversationId ?? null,
      counter: a.counter ?? null,
      createdAt: a.createdAt,
    }));

    return NextResponse.json({ appointments: data });
  } catch (error) {
    console.error("List appointments error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
      bookingSource,
      notes,
    } = body;

    if (!fullName || !mobile || !doctorId || !date || !time) {
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
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid appointment type" }, { status: 400 });
    }

    const source: BookingSource = BOOKING_SOURCES.includes(bookingSource)
      ? bookingSource
      : "manual";

    const db = await getDb();
    const result = await db.collection("appointments").insertOne({
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
      status: "pending",
      bookingSource: source,
      notes: notes ?? null,
      whatsappConversationId: null,
      createdAt: new Date(),
    });

    await reassignCounters(db, date);

    return NextResponse.json(
      {
        appointment: {
          id: result.insertedId.toString(),
          fullName,
          mobile,
          date,
          time,
          type,
          status: "pending",
          bookingSource: source,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create appointment error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
