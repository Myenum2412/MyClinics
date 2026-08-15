import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { ROLES, type Role } from "@/lib/roles";

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post("/api/auth/register", async (request, reply) => {
    try {
      const { name, email, password, role } = (request.body ?? {}) as Record<
        string,
        unknown
      >;

      if (!name || !email || !password || !role) {
        return reply
          .code(400)
          .send({ error: "Name, email, password and role are required" });
      }
      if (!ROLES.includes(role as Role)) {
        return reply.code(400).send({ error: "Invalid role" });
      }
      if (typeof password !== "string" || password.length < 6) {
        return reply.code(400).send({ error: "Password must be at least 6 characters" });
      }

      const db = await getDb();
      const users = db.collection("users");
      const existing = await users.findOne({ email: String(email).toLowerCase() });
      if (existing) {
        return reply
          .code(409)
          .send({ error: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);
      const result = await users.insertOne({
        name,
        email: String(email).toLowerCase(),
        password: hashedPassword,
        role: role as Role,
        image: null,
        createdAt: new Date(),
      });

      return reply.code(201).send({
        user: {
          id: result.insertedId.toString(),
          name,
          email: String(email).toLowerCase(),
          role,
        },
      });
    } catch (error) {
      console.error("Register error", error);
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });

  app.post("/api/auth/forgot-password", async (request, reply) => {
    try {
      const { email } = (request.body ?? {}) as Record<string, unknown>;
      if (!email) {
        return reply.code(400).send({ error: "Email is required" });
      }

      const db = await getDb();
      const users = db.collection("users");
      const user = await users.findOne({ email: String(email).toLowerCase() });

      // Always return the same message so emails can't be enumerated.
      if (!user) {
        return reply.send({
          message: "If an account exists for this email, a reset link has been sent.",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await users.updateOne(
        { _id: user._id },
        { $set: { resetToken: token, resetTokenExpires: expires } }
      );

      const origin =
        request.headers.origin ??
        `${request.protocol}://${request.headers.host ?? "localhost:3000"}`;
      const resetUrl = `${origin}/reset-password?token=${token}`;

      // NOTE: In production, email this link to the user instead.
      console.log(`Password reset link for ${email}: ${resetUrl}`);

      return reply.send({
        message: "If an account exists for this email, a reset link has been sent.",
        // Demo convenience: return the link so it can be tested without an email provider.
        resetUrl,
      });
    } catch (error) {
      console.error("Forgot password error", error);
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });

  app.post("/api/auth/reset-password", async (request, reply) => {
    try {
      const { token, password } = (request.body ?? {}) as Record<string, unknown>;
      if (!token || !password) {
        return reply.code(400).send({
          error: "Token and new password are required",
        });
      }
      if (typeof password !== "string" || password.length < 6) {
        return reply.code(400).send({
          error: "Password must be at least 6 characters",
        });
      }

      const db = await getDb();
      const users = db.collection("users");
      const user = await users.findOne({ resetToken: token });

      if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
        return reply
          .code(400)
          .send({ error: "This reset link is invalid or has expired" });
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);
      await users.updateOne(
        { _id: user._id },
        {
          $set: { password: hashedPassword },
          $unset: { resetToken: "", resetTokenExpires: "" },
        }
      );

      return reply.send({
        message: "Password has been reset. You can now log in.",
      });
    } catch (error) {
      console.error("Reset password error", error);
      return reply.code(500).send({
        error: "Something went wrong. Please try again.",
      });
    }
  });
}