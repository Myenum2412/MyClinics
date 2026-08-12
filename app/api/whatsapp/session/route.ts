import { NextResponse } from "next/server";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { readSessionStateFromDisk } from "@/services/whatsapp/whatsapp.session";

export const dynamic = "force-dynamic";

const QR_FRESH_MS = 5 * 60 * 1000;
const QR_IMAGE_WIDTH = 360;

function sessionDir(): string {
  return process.env.WHATSAPP_SESSION_PATH ?? "./whatsapp-session";
}

function readQrText(): { content: string; generatedAt: string } | null {
  const file = join(sessionDir(), "qr.txt");
  try {
    const stat = statSync(file);
    if (Date.now() - stat.mtimeMs > QR_FRESH_MS) return null;
    return {
      content: readFileSync(file, "utf-8"),
      generatedAt: new Date(stat.mtimeMs).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = readSessionStateFromDisk();
    const qrText = readQrText();

    let qr: { dataUrl: string; generatedAt: string } | null = null;
    if (qrText && (state === null || state.stage !== "ready")) {
      qr = {
        dataUrl: await QRCode.toDataURL(qrText.content, {
          width: QR_IMAGE_WIDTH,
          margin: 2,
          errorCorrectionLevel: "M",
        }),
        generatedAt: qrText.generatedAt,
      };
    }

    return NextResponse.json({ state, qr });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
