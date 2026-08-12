import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection("users");
    const user = await users.findOne({ email: email.toLowerCase() });

    // Always return the same message so emails can't be enumerated.
    if (!user) {
      return NextResponse.json({
        message: "If an account exists for this email, a reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await users.updateOne(
      { _id: user._id },
      { $set: { resetToken: token, resetTokenExpires: expires } }
    );

    const resetUrl = `${new URL(request.url).origin}/reset-password?token=${token}`;

    // NOTE: In production, email this link to the user instead.
    console.log(`Password reset link for ${email}: ${resetUrl}`);

    return NextResponse.json({
      message: "If an account exists for this email, a reset link has been sent.",
      // Demo convenience: return the link so it can be tested without an email provider.
      resetUrl,
    });
  } catch (error) {
    console.error("Forgot password error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
