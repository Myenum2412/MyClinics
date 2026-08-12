import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOrganization } from "@/services/customer/customer-context.service";
import { rescheduleAppointment } from "@/services/ai/appointment.service";
import { rescheduleAppointmentSchema } from "@/services/ai/schemas";
import { aiAuthResponse, mapErrorStatus, readJson } from "@/services/ai/route-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = aiAuthResponse(request);
  if (authError) return authError;

  const body = await readJson(request);
  if ("error" in body) return body.error;

  const parsed = rescheduleAppointmentSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const org = await getOrganization(db, parsed.data.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const result = await rescheduleAppointment(db, org, parsed.data);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: mapErrorStatus(result.code) }
      );
    }

    return NextResponse.json({ appointment: result.appointment });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
