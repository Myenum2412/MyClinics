import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { requireClinicOf } from "@/clinic/core/context";
import { now as nowFn } from "@/clinic/core/datetime";
import type { ClinicContext } from "@/clinic/core/context";
import type { AvatarDocument, AvatarOwnerType } from "@/clinic/modules/avatars/avatars.schema";

/**
 * Stores avatar binaries directly in MongoDB (the `clc_avatars` collection)
 * instead of an external object store. Each (clinicId, ownerType, ownerId)
 * owns exactly one document, upserted on upload.
 */
export class AvatarRepository {
  private constructor(private readonly db: Db, private readonly ctx: ClinicContext) {}

  static for(db: Db, ctx: ClinicContext): AvatarRepository {
    return new AvatarRepository(db, ctx);
  }

  private get collection() {
    return this.db.collection<AvatarDocument>(CLINIC_COLLECTIONS.avatars);
  }

  private key(ownerType: AvatarOwnerType, ownerId: string) {
    return { clinicId: requireClinicOf(this.ctx), ownerType, ownerId };
  }

  async upsert(
    ownerType: AvatarOwnerType,
    ownerId: string,
    contentType: string,
    data: Buffer
  ): Promise<void> {
    const ts = nowFn();
    await this.collection.updateOne(
      this.key(ownerType, ownerId),
      {
        $set: {
          contentType,
          data: data as unknown as AvatarDocument["data"],
          size: data.length,
          updatedAt: ts,
        },
        $setOnInsert: { createdAt: ts },
      },
      { upsert: true }
    );
  }

  async findOne(
    ownerType: AvatarOwnerType,
    ownerId: string
  ): Promise<AvatarDocument | null> {
    return this.collection.findOne(this.key(ownerType, ownerId), {
      projection: { data: 1, contentType: 1, size: 1 },
    });
  }

  async delete(ownerType: AvatarOwnerType, ownerId: string): Promise<void> {
    await this.collection.deleteOne(this.key(ownerType, ownerId));
  }
}

export async function getAvatarRepository(
  ctx: ClinicContext
): Promise<AvatarRepository> {
  return AvatarRepository.for(await getDb(), ctx);
}
