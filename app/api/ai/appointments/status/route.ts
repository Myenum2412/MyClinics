import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOrganization } from "@/services/customer/customer-context.service";
import { getCustomerAppointments } from "@/services/ai/appointment.service";
import { appointmentStatusSchema } from "@/services/ai/schemas";
import { aiAuthResponse } from "@/services/ai/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = aiAuthResponse(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const parsed = appointmentStatusSchema.safeParse({
    organizationId: searchParams.get("organizationId") ?? "",
    customerPhone: searchParams.get("customerPhone") ?? "",
  });
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

    const appointments = await getCustomerAppointments(
      db,
      parsed.data.organizationId,
      parsed.data.customerPhone
    );
    return NextResponse.json({ appointments });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
