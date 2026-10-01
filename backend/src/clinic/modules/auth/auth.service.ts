import { now as nowFn } from "@/clinic/core/datetime";
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
  normalizePhone,
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
      authProvider: "password",
      role: "clinic_admin",
      doctorId: null,
      staffId: null,
      patientId: null,
      phone: input.phone ?? null,
      status: "active",
      lastLoginAt: null,
      createdAt: nowFn(),
      updatedAt: nowFn(),
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

  /**
   * Google-native signup — creates the clinic + first clinic_admin WITHOUT
   * a password. Only reachable with a ticket minted by the Google OAuth
   * callback for a verified email, so the email is trusted.
   */
  async signupWithGoogle(input: {
    clinicName: string;
    adminName: string;
    email: string;
  }) {
    const email = normalizeEmail(input.email);
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const clinicId = generateClinicId();
    const userId = generateUserId();

    const clinic = await this.repo.createClinic({
      clinicId,
      slug: slugify(input.clinicName),
      name: input.clinicName,
      phone: null,
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
      passwordHash: null,
      authProvider: "google",
      role: "clinic_admin",
      doctorId: null,
      staffId: null,
      patientId: null,
      phone: null,
      status: "active",
      lastLoginAt: null,
      createdAt: nowFn(),
      updatedAt: nowFn(),
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
      metadata: { clinicName: clinic.name, email, actorUserId: userId, provider: "google" },
    });
    await writeAudit(
      this.db,
      { userId, clinicId, role: "clinic_admin", name: input.adminName, email, doctorId: null, patientId: null, tokenId: "", ip: null, userAgent: null },
      {
        action: "create",
        entity: "clinic",
        entityId: clinicId,
        metadata: { name: clinic.name, provider: "google" },
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
    // Accepts either an email or a mobile/WhatsApp number as the identifier.
    // Legacy clients send { email }; newer clients send { identifier }.
    const rawIdentifier = (input.identifier ?? (input as { email?: string }).email ?? "").trim();
    if (rawIdentifier.includes("@")) {
      return this.loginWithEmail(normalizeEmail(rawIdentifier), input.password, meta, input.clinicId ?? null);
    }
    const phoneKey = normalizePhone(rawIdentifier);
    if (!phoneKey) {
      void writeAudit(this.db, null, {
        action: "login_failed",
        entity: "user",
        entityId: null,
        metadata: { identifier: rawIdentifier, reason: "bad_identifier" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      }).catch(()=>{});
      throw new UnauthorizedError("Invalid email or WhatsApp number");
    }
    return this.loginWithPhone(phoneKey, rawIdentifier, input.password, meta, input.clinicId ?? null);
  }

  private async loginWithEmail(
    email: string,
    password: string,
    meta: { ip: string | null; userAgent: string | null },
    _clinicId: string | null
  ) {
    const user = await this.repo.findUserByEmail(email);
    if (!user) {
      void writeAudit(this.db, null, {
        action: "login_failed",
        entity: "user",
        entityId: null,
        metadata: { email, reason: "no_account" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      }).catch(()=>{});
      throw new UnauthorizedError("Invalid email or password");
    }
    if (user.authProvider === "google" || typeof user.passwordHash !== "string") {
      void writeAudit(this.db, userToCtx(user), {
        action: "login_failed",
        entity: "user",
        entityId: user.userId,
        metadata: { email: user.email, reason: "google_only_account" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      }).catch(()=>{});
      throw new UnauthorizedError(
        "This account uses Google sign-in — click Continue with Google"
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      void writeAudit(this.db, userToCtx(user), {
        action: "login_failed",
        entity: "user",
        entityId: user.userId,
        metadata: { email: user.email, reason: "bad_password" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      }).catch(()=>{});
      throw new UnauthorizedError("Invalid email or password");
    }

    return this.finishLogin(user, meta);
  }

  /**
   * Patient/staff dashboard login with a mobile or WhatsApp number + password.
   *
   * Resolution order:
   *   1. users.phone (portal accounts store the patient's mobile there)
   *   2. patients.mobile / patients.whatsapp -> linked users.patientId account
   * Numbers are compared by last-10 digits so +91, spaces and dashes all match.
   * When several accounts share one number (family contact) and share the
   * same password, `clinicId` disambiguates; otherwise login asks for email.
   */
  private async loginWithPhone(
    phoneKey: string,
    rawIdentifier: string,
    password: string,
    meta: { ip: string | null; userAgent: string | null },
    clinicId: string | null
  ) {
    const candidates = new Map<string, UserDoc>();

    // 1) Direct portal-account phone match.
    try {
      const byPhone = await this.repo.findUserCandidatesByPhone(phoneKey);
      for (const u of byPhone) {
        if (normalizePhone(u.phone) === phoneKey && u.userId) {
          candidates.set(u.userId, u);
        }
      }
    } catch {
      // candidate lookup must never block login
    }

    // 2) Patient-profile fallback: mobile / whatsapp -> linked portal user.
    // Covers accounts where user.phone differs from patient.whatsapp.
    try {
      const { CLINIC_COLLECTIONS } = await import("@/clinic/core/collections");
      const patients = await this.db
        .collection(CLINIC_COLLECTIONS.patients)
        .find({
          $or: [{ mobile: { $regex: phoneKey } }, { whatsapp: { $regex: phoneKey } }],
        })
        .limit(50)
        .toArray();
      const { normalizePhone: norm } = await import("@/clinic/core/ids");
      const matched = patients.filter(
        (p: Record<string, unknown>) =>
          norm(p.mobile as string) === phoneKey || norm(p.whatsapp as string | null) === phoneKey
      );
      const userIds = matched
        .map((p: Record<string, unknown>) => p.userId as string | null)
        .filter((v): v is string => typeof v === "string" && v.length > 0);
      for (const userId of userIds) {
        if (candidates.has(userId)) continue;
        const u = await this.repo.findUserById(userId);
        if (u) candidates.set(u.userId, u);
      }
    } catch {
      // patient fallback is best-effort
    }

    let pool = [...candidates.values()];
    if (clinicId) {
      const scoped = pool.filter((u) => u.clinicId === clinicId);
      if (scoped.length > 0) pool = scoped;
    }

    if (pool.length === 0) {
      void writeAudit(this.db, null, {
        action: "login_failed",
        entity: "user",
        entityId: null,
        metadata: { phone: rawIdentifier, reason: "no_account" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      }).catch(()=>{});
      throw new UnauthorizedError("Invalid WhatsApp number or password");
    }

    // Several portal accounts may share one family number — try each
    // password until one matches (timing-safe per account via bcrypt).
    const passwordMatches: UserDoc[] = [];
    for (const user of pool) {
      if (user.authProvider === "google" || typeof user.passwordHash !== "string") continue;
      try {
        if (await bcrypt.compare(password, user.passwordHash)) passwordMatches.push(user);
      } catch {
        // ignore a single bad hash
      }
    }

    if (passwordMatches.length === 0) {
      const first = pool[0];
      const googleOnly = pool.every(
        (u) => u.authProvider === "google" || typeof u.passwordHash !== "string"
      );
      void writeAudit(this.db, userToCtx(first), {
        action: "login_failed",
        entity: "user",
        entityId: first.userId,
        metadata: { phone: rawIdentifier, reason: googleOnly ? "google_only_account" : "bad_password" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      }).catch(()=>{});
      throw new UnauthorizedError(
        googleOnly
          ? "This account uses Google sign-in — click Continue with Google"
          : "Invalid WhatsApp number or password"
      );
    }

    if (passwordMatches.length > 1 && !clinicId) {
      void writeAudit(this.db, userToCtx(passwordMatches[0]), {
        action: "login_failed",
        entity: "user",
        entityId: passwordMatches[0].userId,
        metadata: { phone: rawIdentifier, reason: "ambiguous_phone" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      }).catch(()=>{});
      throw new UnauthorizedError(
        "Several accounts share this number — please log in with your email instead"
      );
    }

    const user = (clinicId
      ? passwordMatches.find((u) => u.clinicId === clinicId)
      : passwordMatches[0]) ?? passwordMatches[0];

    if (user.status !== "active") {
      throw new UnauthorizedError("This account has been deactivated");
    }

    return this.finishLogin(user, meta);
  }

  private async finishLogin(
    user: UserDoc,
    meta: { ip: string | null; userAgent: string | null }
  ) {
    if (user.status !== "active") {
      throw new UnauthorizedError("This account has been deactivated");
    }
    let clinicName: string | null = null;
    if (user.role !== "platform_admin" && user.clinicId) {
      const clinic = await this.repo.findClinicByClinicId(user.clinicId);
      if (!clinic || clinic.status !== "active") {
        throw new UnauthorizedError("This clinic is not active");
      }
      clinicName = clinic.name;
    }

    // Non-critical writes: don't block login response (prevents 504 when DB slow)
    void this.repo.touchLastLogin(user.userId).catch(() => {});
    void writeAudit(this.db, userToCtx(user), {
      action: "login",
      entity: "user",
      entityId: user.userId,
      metadata: { email: user.email },
      ip: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => {});

    const token = await this.issueToken({
      userId: user.userId,
      clinicId: user.clinicId,
      role: user.role,
      name: user.name,
      email: user.email,
      doctorId: user.doctorId,
      patientId: user.patientId,
    });

    return {
      userId: user.userId,
      clinicId: user.clinicId,
      clinicName,
      role: user.role,
      name: user.name,
      email: user.email,
      doctorId: user.doctorId,
      patientId: user.patientId,
      token,
      tokenExpiresInSeconds: accessTokenTtlSeconds(),
    };
  }

  /**
   * Google sign-in: links by verified email. The user (and their clinic)
   * must already exist and be active — Google never creates accounts.
   */
  async loginWithGoogle(email: string, meta: { ip: string | null; userAgent: string | null }) {
    const normalized = normalizeEmail(email);
    const user = await this.repo.findUserByEmail(normalized);
    if (!user) {
      await writeAudit(this.db, null, {
        action: "login_failed",
        entity: "user",
        entityId: null,
        metadata: { email: normalized, reason: "google_no_account" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedError("No clinic account matches this Google email");
    }

    if (user.status !== "active") {
      throw new UnauthorizedError("This account has been deactivated");
    }

    let clinicName2: string | null = null;
    if (user.role !== "platform_admin" && user.clinicId) {
      const clinic = await this.repo.findClinicByClinicId(user.clinicId);
      if (!clinic || clinic.status !== "active") {
        throw new UnauthorizedError("This clinic is not active");
      }
      clinicName2 = clinic.name;
    }

    void this.repo.touchLastLogin(user.userId).catch(()=>{});
    void writeAudit(this.db, userToCtx(user), {
      action: "login",
      entity: "user",
      entityId: user.userId,
      metadata: { email: user.email, provider: "google" },
      ip: meta.ip,
      userAgent: meta.userAgent,
    }).catch(()=>{});

    const token = await this.issueToken({
      userId: user.userId,
      clinicId: user.clinicId,
      role: user.role,
      name: user.name,
      email: user.email,
      doctorId: user.doctorId,
      patientId: user.patientId,
    });

    return {
      userId: user.userId,
      clinicId: user.clinicId,
      clinicName: clinicName2,
      role: user.role,
      name: user.name,
      email: user.email,
      doctorId: user.doctorId,
      patientId: user.patientId,
      token,
      tokenExpiresInSeconds: accessTokenTtlSeconds(),
    };
  }

  /** Re-issues a fresh token from a still-valid one (rotation + revocation). */
  async refresh(token: string) {
    let verified: Awaited<ReturnType<typeof verifyClinicToken>>;
    try {
      verified = await verifyClinicToken(token);
    } catch {
      throw new UnauthorizedError("Session is no longer valid");
    }
    // Check revocation first (logout / reuse detection)
    const { isRevoked, revokeJti } = await import("@/clinic/core/revocation");
    if (verified.jti && (await isRevoked(verified.jti))) {
      throw new UnauthorizedError("Session has been revoked");
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

    // Rotate: revoke the old jti so reuse is detected (SEC-003)
    if (verified.jti) {
      await revokeJti(verified.jti, verified.expiresAt * 1000);
    }

    await writeAudit(this.db, userToCtx(user), {
      action: "refresh",
      entity: "user",
      entityId: user.userId,
    });

    return { token: fresh, tokenExpiresInSeconds: accessTokenTtlSeconds() };
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
