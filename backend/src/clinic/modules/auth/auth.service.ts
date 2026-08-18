import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { writeAudit } from "@/clinic/core/audit";
import {
  ConflictError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import {
  generateClinicId,
  generateUserId,
  normalizeEmail,
  slugify,
} from "@/clinic/core/ids";
import {
  accessTokenTtlSeconds,
  signClinicToken,
  verifyClinicToken,
  type ClinicTokenPayload,
} from "@/clinic/core/jwt";
import { isClinicRole, type ClinicRole } from "@/clinic/core/roles";
import type { LoginInput, SignupInput } from "@/clinic/modules/auth/auth.dto";
import { AuthRepository } from "@/clinic/modules/auth/auth.repository";
import type { UserDoc } from "@/clinic/core/types";

export class AuthService {
  private readonly repo: AuthRepository;

  constructor(private readonly db: Db) {
    this.repo = new AuthRepository(db);
  }

  /**
   * Clinic signup — the ONLY place a tenant is born.
   * Creates the clinic (generating its clinicId) and the first
   * clinic_admin user, then returns a session token.
   */
  async signup(input: SignupInput) {
    const email = normalizeEmail(input.email);
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const clinicId = generateClinicId();
    const userId = generateUserId();
    const passwordHash = await bcrypt.hash(input.password, 12);

    const clinic = await this.repo.createClinic({
      clinicId,
      slug: slugify(input.clinicName),
      name: input.clinicName,
      phone: input.phone ?? null,
      email: null,
      address: null,
      website: null,
      description: null,
      status: "active",
      settings: {
        workingHours: { open: "09:00", close: "18:00" },
        slotMinutes: 30,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
    });

    const userDoc: UserDoc = {
      clinicId,
      userId,
      name: input.adminName,
      email,
      passwordHash,
      role: "clinic_admin",
      doctorId: null,
      staffId: null,
      patientId: null,
      phone: input.phone ?? null,
      status: "active",
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.repo.createUser(userDoc);

    const token = await this.issueToken({
      userId,
      clinicId,
      role: "clinic_admin",
      name: input.adminName,
      email,
      doctorId: null,
      patientId: null,
    });

    await writeAudit(this.db, null, {
      action: "signup",
      entity: "clinic",
      entityId: clinicId,
      metadata: { clinicName: clinic.name, email, actorUserId: userId },
    });
    await writeAudit(
      this.db,
      { userId, clinicId, role: "clinic_admin", name: input.adminName, email, doctorId: null, patientId: null, tokenId: "", ip: null, userAgent: null },
      {
        action: "create",
        entity: "clinic",
        entityId: clinicId,
        metadata: { name: clinic.name },
      }
    );

    return {
      clinicId,
      clinicName: clinic.name,
      slug: clinic.slug,
      userId,
      role: "clinic_admin" as const,
      token,
      tokenExpiresInSeconds: accessTokenTtlSeconds(),
    };
  }

  async login(input: LoginInput, meta: { ip: string | null; userAgent: string | null }) {
    const email = normalizeEmail(input.email);
    const user = await this.repo.findUserByEmail(email);
    if (!user || typeof user.passwordHash !== "string") {
      await writeAudit(this.db, null, {
        action: "login_failed",
        entity: "user",
        entityId: null,
        metadata: { email, reason: "no_account" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      await writeAudit(this.db, userToCtx(user), {
        action: "login_failed",
        entity: "user",
        entityId: user.userId,
        metadata: { email: user.email, reason: "bad_password" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status !== "active") {
      throw new UnauthorizedError("This account has been deactivated");
    }

    if (user.role !== "platform_admin") {
      const clinic = user.clinicId
        ? await this.repo.findClinicByClinicId(user.clinicId)
        : null;
      if (!clinic || clinic.status !== "active") {
        throw new UnauthorizedError("This clinic is not active");
      }
    }

    await this.repo.touchLastLogin(user.userId);

    const token = await this.issueToken({
      userId: user.userId,
      clinicId: user.clinicId,
      role: user.role,
      name: user.name,
      email: user.email,
      doctorId: user.doctorId,
      patientId: user.patientId,
    });

    await writeAudit(this.db, userToCtx(user), {
      action: "login",
      entity: "user",
      entityId: user.userId,
      metadata: { email: user.email },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      userId: user.userId,
      clinicId: user.clinicId,
      clinicName: user.clinicId ? (await this.repo.findClinicByClinicId(user.clinicId))?.name ?? null : null,
      role: user.role,
      name: user.name,
      email: user.email,
      doctorId: user.doctorId,
      patientId: user.patientId,
      token,
      tokenExpiresInSeconds: accessTokenTtlSeconds(),
    };
  }

  /** Re-issues a fresh token from a still-valid one (sliding expiry). */
  async refresh(token: string) {
    let verified: Awaited<ReturnType<typeof verifyClinicToken>>;
    try {
      verified = await verifyClinicToken(token);
    } catch {
      throw new UnauthorizedError("Session is no longer valid");
    }
    const user = await this.repo.findUserById(verified.userId);
    if (!user || user.status !== "active") {
      throw new UnauthorizedError("Session is no longer valid");
    }
    if ((user.clinicId ?? null) !== (verified.clinicId ?? null)) {
      throw new UnauthorizedError("Session is no longer valid");
    }

    const fresh = await this.issueToken({
      userId: user.userId,
      clinicId: user.clinicId,
      role: user.role,
      name: user.name,
      email: user.email,
      doctorId: user.doctorId,
      patientId: user.patientId,
    });

    await writeAudit(this.db, userToCtx(user), {
      action: "refresh",
      entity: "user",
      entityId: user.userId,
    });

    return fresh;
  }

  private async issueToken(payload: ClinicTokenPayload): Promise<string> {
    return signClinicToken(payload);
  }
}

function userToCtx(user: UserDoc) {
  return {
    userId: user.userId,
    clinicId: user.clinicId,
    role: user.role as ClinicRole,
    name: user.name,
    email: user.email,
    doctorId: user.doctorId,
    patientId: user.patientId,
    tokenId: "",
    ip: null,
    userAgent: null,
  };
}
