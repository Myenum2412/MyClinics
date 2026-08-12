import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import { getOrganization } from "@/services/customer/customer-context.service";
import { todayISO } from "@/services/ai/dates";
import { aiAuthResult } from "@/services/ai/ai-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = aiAuthResult(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason === "not_configured" ? "AI_INTERNAL_TOKEN is not configured" : "Unauthorized" },
      { status: auth.reason === "not_configured" ? 500 : 401 }
    );
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId") ?? "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const org = await getOrganization(db, organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const doctors = await db
      .collection(DB_COLLECTIONS.users)
      .find({ role: "doctor" }, { projection: { name: 1 } })
      .toArray();

    return NextResponse.json({
      organizationId,
      doctors: doctors.map((d) => d.name).sort(),
      todayISO: todayISO(),
      workingHours: org.settings,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
