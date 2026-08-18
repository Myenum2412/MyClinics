import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { writeAudit } from "@/mt/core/audit";
import {
  UnauthorizedError,
  ConflictError,
} from "@/mt/core/errors";
import {
  generateClinicId,
  generateUserId,
  normalizeEmail,
  slugify,
} from "@/mt/core/ids";
import {
  accessTokenTtlSeconds,
  signTenantToken,
  verifyTenantToken,
  type TenantTokenPayload,
} from "@/mt/core/jwt";
import type { LoginInput, SignupInput } from "@/mt/modules/auth/auth.dto";
import { AuthRepository } from "@/mt/modules/auth/auth.repository";
import type { MtUserDoc } from "@/mt/modules/auth/auth.schema";

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
    });

    const userDoc: MtUserDoc = {
      clinicId,
      userId,
      name: input.adminName,
      email,
      passwordHash,
      role: "clinic_admin",
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
      patientId: null,
    });

    await writeAudit(this.db, null, {
      action: "signup",
      entity: "clinic",
      entityId: clinicId,
      metadata: { clinicName: clinic.name, email, actorUserId: userId },
    });
    await writeAudit(this.db, { clinicId, userId, role: "clinic_admin" }, {
      action: "create",
      entity: "clinic",
      entityId: clinicId,
      metadata: { name: clinic.name },
    });

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
    const user = await this.repo.findUserByEmail(normalizeEmail(input.email));
    if (!user || typeof user.passwordHash !== "string") {
      await writeAudit(this.db, null, {
        action: "login_failed",
        entity: "user",
        entityId: null,
        metadata: { email: normalizeEmail(input.email), reason: "no_account" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      await writeAudit(this.db, { clinicId: user.clinicId, userId: user.userId, role: user.role }, {
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

    const clinic = await this.repo.findClinicByClinicId(user.clinicId);
    if (!clinic || clinic.status !== "active") {
      throw new UnauthorizedError("This clinic is not active");
    }

    await this.repo.touchLastLogin(user.userId);

    const token = await this.issueToken({
      userId: user.userId,
      clinicId: user.clinicId,
      role: user.role,
      name: user.name,
      email: user.email,
      patientId: user.patientId,
    });

    await writeAudit(this.db, { clinicId: user.clinicId, userId: user.userId, role: user.role }, {
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
      clinicName: clinic.name,
      role: user.role,
      name: user.name,
      email: user.email,
      patientId: user.patientId,
      token,
      tokenExpiresInSeconds: accessTokenTtlSeconds(),
    };
  }

  /** Re-issues a fresh token from a still-valid one (sliding expiry). */
  async refresh(token: string) {
    const verified = await verifyTenantToken(token);
    const user = await this.repo.findUserByEmail(verified.email ?? "");
    if (!user || user.userId !== verified.userId || user.status !== "active") {
      throw new UnauthorizedError("Session is no longer valid");
    }

    const fresh = await this.issueToken({
      userId: user.userId,
      clinicId: user.clinicId,
      role: user.role,
      name: user.name,
      email: user.email,
      patientId: user.patientId,
    });

    await writeAudit(this.db, { clinicId: user.clinicId, userId: user.userId, role: user.role }, {
      action: "refresh",
      entity: "user",
      entityId: user.userId,
    });

    return fresh;
  }

  private async issueToken(payload: TenantTokenPayload): Promise<string> {
    return signTenantToken(payload);
  }
}