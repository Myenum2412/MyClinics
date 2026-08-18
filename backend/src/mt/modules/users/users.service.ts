import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { writeAudit } from "@/mt/core/audit";
import { ConflictError, NotFoundError } from "@/mt/core/errors";
import { generateUserId } from "@/mt/core/ids";
import type { TenantContext } from "@/mt/core/tenant-context";
import { invalidateTenantCache } from "@/mt/core/tenant-scope";
import type { CreateUserInput, UpdateUserInput } from "@/mt/modules/users/users.dto";
import { UserRepository } from "@/mt/modules/users/users.repository";
import type { MtUserDoc } from "@/mt/modules/auth/auth.schema";

export class UserService {
  constructor(private readonly db: Db) {}

  private repo(ctx: TenantContext): UserRepository {
    return new UserRepository(this.db, ctx);
  }

  async createUser(ctx: TenantContext, input: CreateUserInput): Promise<MtUserDoc> {
    const repo = this.repo(ctx);

    const existing = await repo.findOne({ email: input.email });
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const userId = generateUserId();
    const now = new Date();

    const doc: Omit<MtUserDoc, "clinicId"> = {
      userId,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      patientId: null,
      phone: input.phone ?? null,
      status: "active",
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const created = await repo.insert(doc as never);

    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "user",
      entityId: userId,
      metadata: { name: input.name, role: input.role },
    });

    return created;
  }

  async listUsers(ctx: TenantContext, options: { skip: number; limit: number }) {
    return this.repo(ctx).list(options);
  }

  async getUserById(ctx: TenantContext, userId: string): Promise<MtUserDoc> {
    const user = await this.repo(ctx).findByUserId(userId);
    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  async updateUser(ctx: TenantContext, userId: string, input: UpdateUserInput): Promise<MtUserDoc> {
    const repo = this.repo(ctx);
    const user = await repo.findByUserId(userId);
    if (!user) throw new NotFoundError("User not found");

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.status !== undefined) patch.status = input.status;
    patch.updatedAt = new Date();

    await repo.updateOne({ userId }, { $set: patch });
    if (input.status) invalidateTenantCache(userId, ctx.clinicId);

    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "user",
      entityId: userId,
      metadata: { fields: Object.keys(patch).filter((k) => k !== "updatedAt") },
    });

    const updated = await repo.findByUserId(userId);
    return updated ?? user;
  }

  async deleteUser(ctx: TenantContext, userId: string): Promise<void> {
    const repo = this.repo(ctx);
    const user = await repo.findByUserId(userId);
    if (!user) throw new NotFoundError("User not found");
    if (user.role === "clinic_admin") {
      throw new ConflictError("The clinic admin account cannot be deleted");
    }

    await repo.deleteOne({ userId });

    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "user",
      entityId: userId,
      metadata: { name: user.name, role: user.role },
    });
  }
}