import { NextResponse } from "next/server";
import { aiAuthResult } from "@/services/ai/ai-auth";
import type { AppointmentErrorCode } from "@/services/ai/appointment.service";

export function aiAuthResponse(request: Request): NextResponse | null {
  const auth = aiAuthResult(request);
  if (auth.ok) return null;
  return NextResponse.json(
    {
      error:
        auth.reason === "not_configured"
          ? "AI_INTERNAL_TOKEN is not configured"
          : "Unauthorized",
    },
    { status: auth.reason === "not_configured" ? 500 : 401 }
  );
}

export function mapErrorStatus(code: AppointmentErrorCode): number {
  switch (code) {
    case "SLOT_TAKEN":
      return 409;
    case "INVALID_DOCTOR":
    case "INVALID_DATE":
    case "INVALID_TIME":
      return 400;
    case "NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}

export async function readJson(
  request: Request
): Promise<{ data: unknown } | { error: NextResponse }> {
  try {
    return { data: await request.json() };
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}
