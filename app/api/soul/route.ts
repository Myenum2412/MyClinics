import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSoul, updateSoul } from "@/services/ai/soul.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";

export const dynamic = "force-dynamic";

const MAX_SOUL_LENGTH = 40_000;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const org = await ensureDefaultOrganization(db);
    const soul = await getSoul(db, org.id);
    return NextResponse.json({
      soul: {
        content: soul.content,
        fallbackReply: soul.fallbackReply,
        version: soul.version,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Soul content is required" }, { status: 400 });
    }
    if (content.length > MAX_SOUL_LENGTH) {
      return NextResponse.json(
        { error: `Soul content must be under ${MAX_SOUL_LENGTH} characters` },
        { status: 400 }
      );
    }
    const fallbackReply =
      typeof body?.fallbackReply === "string" ? body.fallbackReply.trim() : undefined;
    if (fallbackReply && fallbackReply.length > 1000) {
      return NextResponse.json(
        { error: "Fallback reply must be under 1000 characters" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const org = await ensureDefaultOrganization(db);
    const soul = await updateSoul(db, org.id, content, fallbackReply);
    return NextResponse.json({
      soul: {
        content: soul.content,
        fallbackReply: soul.fallbackReply,
        version: soul.version,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
