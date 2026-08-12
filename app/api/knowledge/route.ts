import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  createKnowledgeDocument,
  listKnowledgeDocuments,
} from "@/services/ai/knowledge.service";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";

export const dynamic = "force-dynamic";

const MAX_TITLE_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 50;
const MAX_CONTENT_LENGTH = 20_000;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const org = await ensureDefaultOrganization(db);
    const documents = await listKnowledgeDocuments(db, org.id);
    return NextResponse.json({
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        content: d.content,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const category =
      typeof body?.category === "string" ? body.category.trim() : "clinic";

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Title must be under ${MAX_TITLE_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (category.length > MAX_CATEGORY_LENGTH) {
      return NextResponse.json(
        { error: `Category must be under ${MAX_CATEGORY_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content must be under ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const db = await getDb();
    const org = await ensureDefaultOrganization(db);
    const document = await createKnowledgeDocument(db, org.id, { title, category, content });
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
