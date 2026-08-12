import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scanAndQueueReminders } from "@/services/reminder/reminder.service";

export const dynamic = "force-dynamic";

/**
 * Entry point for the appointment reminder scheduler (cron-job.org pings this
 * every minute). Scans for appointments inside the reminder window and queues
 * WhatsApp reminders that the worker then sends ~30 minutes before each slot.
 */
export async function POST(request: NextRequest) {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  const header = request.headers.get("x-cron-secret");
  if (header !== configured) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const result = await scanAndQueueReminders(db, new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Cron reminders error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
