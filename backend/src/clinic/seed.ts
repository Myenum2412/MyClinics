import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { generateUserId, normalizeEmail } from "@/clinic/core/ids";
import type { UserDoc } from "@/clinic/core/types";

/**
 * Ensures a platform_admin account exists from environment configuration:
 *   PLATFORM_ADMIN_EMAIL + PLATFORM_ADMIN_PASSWORD
 *
 * The platform admin lives OUTSIDE any clinic (clinicId: null) and manages
 * all clinics via the platform endpoints.
 */
export async function ensurePlatformAdmin(db: Db): Promise<void> {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) return;

  const normalized = normalizeEmail(email);
  const existing = await db
    .collection<UserDoc>(CLINIC_COLLECTIONS.users)
    .findOne({ email: normalized });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  await db.collection(CLINIC_COLLECTIONS.users).insertOne({
    clinicId: null,
    userId: generateUserId(),
    name: "Platform Admin",
    email: normalized,
    passwordHash,
    role: "platform_admin",
    doctorId: null,
    staffId: null,
    patientId: null,
    phone: null,
    status: "active",
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  } as never);
  console.log("[clinic] platform_admin account ensured");
}