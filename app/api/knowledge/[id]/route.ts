import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  deleteKnowledgeDocument,
  updateKnowledgeDocument,
} from "@/services/ai/knowledge.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";

export const dynamic = "force-dynamic";

const MAX_TITLE_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 50;
const MAX_CONTENT_LENGTH = 20_000;

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const category =
      typeof body?.category === "string" ? body.category.trim() : "clinic";

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }
    if (title.length > MAX_TITLE_LENGTH || content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "Title or content is too long" },
        { status: 400 }
      );
    }
    if (category.length > MAX_CATEGORY_LENGTH) {
      return NextResponse.json(
        { error: `Category must be under ${MAX_CATEGORY_LENGTH} characters` },
        { status: 400 }
      );
    }

    const db = await getDb();
    const org = await ensureDefaultOrganization(db);
    const document = await updateKnowledgeDocument(db, org.id, id, {
      title,
      category,
      content,
    });
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        category: document.category,
        content: document.content,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = await getDb();
    const org = await ensureDefaultOrganization(db);
    const deleted = await deleteKnowledgeDocument(db, org.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
